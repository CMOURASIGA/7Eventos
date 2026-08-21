import "server-only";
import { z } from "zod";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { collectEventContext } from "./context";
import { buildAtlasSystemPrompt } from "./prompt";
import { getAtlasClient, getAtlasModel } from "./client";
import { acquireAtlasCall, releaseAtlasCall } from "./limiter";
import type { AtlasAnswer, AtlasChatTurn } from "./types";

const MAX_HISTORY_TURNS = 12;
const MAX_TURN_CONTENT_LENGTH = 4000;
const MAX_QUESTION_LENGTH = 2000;
const MAX_TOTAL_HISTORY_CHARS = 20000;

export class AtlasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasValidationError";
  }
}

/**
 * Bloqueador do validador: a Server Action recebe o histórico de volta
 * do navegador (AtlasChatTurn[]) — nunca confiamos nele cegamente.
 * Valida estrutura (papel/tamanho por item) com Zod e rejeita
 * explicitamente em vez de truncar/coagir em silêncio: um histórico
 * malformado ou artificialmente grande é tratado como entrada inválida,
 * não "corrigido" de forma que mascare o problema.
 */
const AtlasChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_TURN_CONTENT_LENGTH),
});
const AtlasHistorySchema = z.array(AtlasChatTurnSchema).max(MAX_HISTORY_TURNS);

function validateHistory(history: unknown): AtlasChatTurn[] {
  const result = AtlasHistorySchema.safeParse(history);
  if (!result.success) {
    throw new AtlasValidationError("Histórico de conversa inválido. Comece uma nova conversa e tente novamente.");
  }
  const totalChars = result.data.reduce((sum, turn) => sum + turn.content.length, 0);
  if (totalChars > MAX_TOTAL_HISTORY_CHARS) {
    throw new AtlasValidationError("A conversa ficou muito longa para continuar. Comece uma nova conversa.");
  }
  return result.data;
}

/**
 * Atlas (Fase 3) - "assistente contextual" (docs/FASE_03_ATLAS.md seção
 * 4). Camada "chamada ao modelo" + "validação da resposta" + "auditoria"
 * (seção 12) para perguntas livres sobre um evento específico.
 *
 * Autorização: repository.events.get já recusa eventos de outra empresa
 * (retorna null); o próprio contexto já vem filtrado por capability
 * (context.ts). Não há capability própria para "usar o Atlas" — quem
 * enxerga o evento (view_event, concedida a todos os perfis) pode
 * perguntar sobre ele; o que ele pode saber depende do que os dados
 * permitem mostrar a esse perfil.
 */
export async function askAtlas(
  session: AuthSession,
  eventId: string,
  question: string,
  rawHistory: unknown,
  repository: Repository,
): Promise<AtlasAnswer> {
  const history = validateHistory(rawHistory);

  const trimmedQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!trimmedQuestion) {
    throw new AtlasValidationError("Pergunta vazia.");
  }

  await acquireAtlasCall(session, repository);
  const startedAt = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let context: Awaited<ReturnType<typeof collectEventContext>> = null;

  try {
    context = await collectEventContext(session, eventId, repository);
    if (!context) {
      throw new AtlasValidationError("Evento não encontrado.");
    }

    const user = await repository.users.get(session, session.userId);
    const systemPrompt = buildAtlasSystemPrompt(context, user?.nome ?? "usuário");

    const client = getAtlasClient();
    const model = getAtlasModel();
    // Controle de consumo (seção 13): só os últimos N turnos entram na
    // chamada — uma conversa longa não cresce sem limite a cada pergunta.
    const recentHistory = history.slice(-MAX_HISTORY_TURNS);

    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        ...recentHistory.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user" as const, content: trimmedQuestion },
      ],
    });

    inputTokens = response.usage?.input_tokens ?? 0;
    outputTokens = response.usage?.output_tokens ?? 0;

    const textBlock = response.content.find((b) => b.type === "text");
    const resposta = textBlock?.text?.trim() || "Não consegui montar uma resposta para essa pergunta.";

    await recordAtlasAudit(session, repository, {
      entidade: "atlas_pergunta",
      entidadeId: eventId,
      descricao: `Pergunta ao Atlas sobre o evento "${context.evento.titulo}".`,
      status: "sucesso",
      model,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      question: trimmedQuestion,
    });

    return { resposta };
  } catch (err) {
    await recordAtlasAudit(session, repository, {
      entidade: "atlas_pergunta",
      entidadeId: eventId,
      descricao: context
        ? `Falha ao responder pergunta do Atlas sobre o evento "${context.evento.titulo}".`
        : "Falha ao responder pergunta do Atlas.",
      status: "falha",
      model: getAtlasModel(),
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      question: trimmedQuestion,
      errorCode: errorCode(err),
    });
    throw err;
  } finally {
    releaseAtlasCall(session);
  }
}

function errorCode(err: unknown): string {
  if (err instanceof AtlasValidationError) return "validation_error";
  if (err instanceof Error) return err.name || "unknown_error";
  return "unknown_error";
}

/**
 * Auditoria da IA (seção 14): registra sucesso E falha (antes desta
 * correção, só sucesso era auditado — falhas de validação/API/parse
 * ficavam invisíveis). A pergunta é truncada antes de persistir
 * ("evitar persistir conteúdo sensível desnecessário", seção 14).
 */
export async function recordAtlasAudit(
  session: AuthSession,
  repository: Repository,
  params: {
    entidade: string;
    entidadeId: string;
    descricao: string;
    status: "sucesso" | "falha";
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    question?: string;
    errorCode?: string;
  },
): Promise<void> {
  const QUESTION_PREVIEW_LENGTH = 80;
  await repository.audit.record(session, {
    acao: "interacao_ia",
    entidade: params.entidade,
    entidadeId: params.entidadeId,
    descricao: params.descricao,
    metadados: {
      status: params.status,
      modelo: params.model,
      tokensEntrada: params.inputTokens,
      tokensSaida: params.outputTokens,
      duracaoMs: params.durationMs,
      ...(params.question
        ? {
            perguntaPrevia:
              params.question.length > QUESTION_PREVIEW_LENGTH
                ? `${params.question.slice(0, QUESTION_PREVIEW_LENGTH)}…`
                : params.question,
          }
        : {}),
      ...(params.errorCode ? { codigoErro: params.errorCode } : {}),
    },
  });
}
