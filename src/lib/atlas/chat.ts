import "server-only";
import { z } from "zod";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { collectEventContext } from "./context";
import { buildAtlasSystemPrompt } from "./prompt";
import { getAtlasProvider } from "./providers";
import { acquireAtlasCall, releaseAtlasCall } from "./limiter";
import { AtlasValidationError, classifyAtlasError } from "./errors";
import { recordAtlasAudit } from "./audit";
import type { AtlasAnswer, AtlasChatTurn } from "./types";

const MAX_HISTORY_TURNS = 12;
const MAX_TURN_CONTENT_LENGTH = 4000;
const MAX_QUESTION_LENGTH = 2000;
const MAX_TOTAL_HISTORY_CHARS = 20000;
const MAX_OUTPUT_TOKENS = 2000;

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
// Ressalva do validador: a pergunta também era só truncada em silêncio
// (question.slice(0, N)), o que podia mudar o sentido de uma pergunta
// longa sem avisar. Agora segue o mesmo padrão do histórico: rejeita.
const AtlasQuestionSchema = z.string().trim().min(1, "Pergunta vazia.").max(MAX_QUESTION_LENGTH, "Pergunta muito longa.");

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

function validateQuestion(question: unknown): string {
  const result = AtlasQuestionSchema.safeParse(question);
  if (!result.success) {
    throw new AtlasValidationError(
      result.error.issues[0]?.message === "Pergunta vazia."
        ? "Pergunta vazia."
        : `Sua pergunta excede o tamanho máximo permitido (${MAX_QUESTION_LENGTH} caracteres).`,
    );
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
  rawQuestion: unknown,
  rawHistory: unknown,
  repository: Repository,
): Promise<AtlasAnswer> {
  const history = validateHistory(rawHistory);
  const question = validateQuestion(rawQuestion);

  await acquireAtlasCall(session, repository);
  const startedAt = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let model = "desconhecido";
  let responseId: string | undefined;
  let context: Awaited<ReturnType<typeof collectEventContext>> = null;

  try {
    context = await collectEventContext(session, eventId, repository);
    if (!context) {
      throw new AtlasValidationError("Evento não encontrado.");
    }

    const user = await repository.users.get(session, session.userId);
    const systemPrompt = buildAtlasSystemPrompt(context, user?.nome ?? "usuário");

    const provider = getAtlasProvider();
    // Controle de consumo (seção 13): só os últimos N turnos entram na
    // chamada — uma conversa longa não cresce sem limite a cada pergunta.
    const recentHistory = history.slice(-MAX_HISTORY_TURNS);

    const result = await provider.generateText({
      systemPrompt,
      messages: [...recentHistory, { role: "user", content: question }],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    model = result.model;
    responseId = result.responseId;

    await recordAtlasAudit(session, repository, {
      entidade: "atlas_pergunta",
      entidadeId: eventId,
      descricao: `Pergunta ao Atlas sobre o evento "${context.evento.titulo}".`,
      status: "sucesso",
      consomeCota: true,
      provider: result.provider,
      model,
      responseId,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      question,
    });

    return { resposta: result.text };
  } catch (err) {
    const { codigoErro, consomeCota } = classifyAtlasError(err);
    await recordAtlasAudit(session, repository, {
      entidade: "atlas_pergunta",
      entidadeId: eventId,
      descricao: context
        ? `Falha ao responder pergunta do Atlas sobre o evento "${context.evento.titulo}".`
        : "Falha ao responder pergunta do Atlas.",
      status: "falha",
      consomeCota,
      model,
      responseId,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      question,
      errorCode: codigoErro,
    });
    throw err;
  } finally {
    releaseAtlasCall(session);
  }
}
