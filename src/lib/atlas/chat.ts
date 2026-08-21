import "server-only";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { collectEventContext } from "./context";
import { buildAtlasSystemPrompt } from "./prompt";
import { getAtlasClient, ATLAS_MODEL } from "./client";
import type { AtlasAnswer, AtlasChatTurn } from "./types";

const MAX_HISTORY_TURNS = 12;
const MAX_QUESTION_LENGTH = 2000;

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
  history: AtlasChatTurn[],
  repository: Repository,
): Promise<AtlasAnswer> {
  const trimmedQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!trimmedQuestion) {
    throw new Error("Pergunta vazia.");
  }

  const context = await collectEventContext(session, eventId, repository);
  if (!context) {
    throw new Error("Evento não encontrado.");
  }

  const user = await repository.users.get(session, session.userId);
  const systemPrompt = buildAtlasSystemPrompt(context, user?.nome ?? "usuário");

  const client = getAtlasClient();
  // Controle de consumo (seção 13): só os últimos N turnos entram na
  // chamada — uma conversa longa não cresce sem limite a cada pergunta.
  const recentHistory = history.slice(-MAX_HISTORY_TURNS);

  const response = await client.messages.create({
    model: ATLAS_MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      ...recentHistory.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: trimmedQuestion },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const resposta = textBlock?.text?.trim() || "Não consegui montar uma resposta para essa pergunta.";

  await repository.audit.record(session, {
    acao: "interacao_ia",
    entidade: "atlas_pergunta",
    entidadeId: eventId,
    descricao: `Pergunta ao Atlas sobre o evento "${context.evento.titulo}".`,
    metadados: { pergunta: trimmedQuestion },
  });

  return { resposta };
}
