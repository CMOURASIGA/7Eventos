import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { collectEventContext } from "./context";
import { buildAtlasSystemPrompt } from "./prompt";
import { getAtlasClient, ATLAS_MODEL } from "./client";

/**
 * Atlas (Fase 3) - "resumo executivo" (docs/FASE_03_ATLAS.md seção 5).
 *
 * Saída estruturada (não prosa livre) via output_config.format: cada
 * campo é opcional/anulável, e a UI só renderiza a seção quando o campo
 * vem preenchido — é assim que "não incluir seções sem dados como se
 * fossem fatos" (regra explícita da seção 5) é garantido mecanicamente,
 * em vez de depender só de o modelo obedecer uma instrução em texto.
 */
export const AtlasRiskItemSchema = z.object({
  descricao: z.string(),
  severidade: z.enum(["baixa", "media", "alta", "critica"]),
});

export const AtlasSummarySchema = z.object({
  situacao: z.string().describe("Situação geral do evento agora, em 1-2 frases objetivas."),
  proximosMarcos: z.array(z.string()).describe("Próximos marcos/datas relevantes. Lista vazia se não houver nenhum."),
  pendencias: z.array(z.string()).describe("O que está pendente agora. Lista vazia se não houver nenhuma."),
  riscos: z.array(AtlasRiskItemSchema).describe("Riscos identificados a partir do contexto fornecido. Lista vazia se não houver nenhum."),
  orcamento: z
    .string()
    .nullable()
    .describe("Resumo textual do orçamento (previsto/comprometido/realizado). null se o campo financeiro do contexto for null."),
  reservas: z.string().nullable().describe("Resumo textual das reservas. null se não houver nenhuma."),
  equipe: z.string().nullable().describe("Resumo textual da equipe alocada. null se não houver nenhuma."),
  fornecedores: z.string().nullable().describe("Resumo textual dos fornecedores vinculados. null se não houver nenhum."),
  participantes: z.string().nullable().describe("Resumo textual de inscrições/presença. null se não houver nenhuma inscrição."),
  recomendacoes: z.array(z.string()).describe("Recomendações objetivas e acionáveis. Lista vazia se não houver nenhuma a fazer."),
});

export type AtlasSummary = z.infer<typeof AtlasSummarySchema>;

export async function generateExecutiveSummary(
  session: AuthSession,
  eventId: string,
  repository: Repository,
): Promise<AtlasSummary> {
  const context = await collectEventContext(session, eventId, repository);
  if (!context) {
    throw new Error("Evento não encontrado.");
  }

  const user = await repository.users.get(session, session.userId);
  const systemPrompt = buildAtlasSystemPrompt(context, user?.nome ?? "usuário");

  const client = getAtlasClient();
  const response = await client.messages.parse({
    model: ATLAS_MODEL,
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          "Gere o resumo executivo deste evento agora, seguindo exatamente o formato pedido. Deixe null/lista vazia qualquer seção sem dado no contexto — nunca invente.",
      },
    ],
    output_config: { format: zodOutputFormat(AtlasSummarySchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Atlas não conseguiu montar o resumo executivo desta vez.");
  }

  await repository.audit.record(session, {
    acao: "interacao_ia",
    entidade: "atlas_resumo",
    entidadeId: eventId,
    descricao: `Resumo executivo gerado pelo Atlas para o evento "${context.evento.titulo}".`,
  });

  return response.parsed_output;
}
