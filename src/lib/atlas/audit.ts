import "server-only";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";

const QUESTION_PREVIEW_LENGTH = 80;

/**
 * Auditoria da IA (docs/FASE_03_ATLAS.md seção 14): registra sucesso E
 * falha — antes só sucesso era auditado, falhas de validação/rate
 * limit/API/parse ficavam invisíveis. A pergunta é truncada antes de
 * persistir ("evitar persistir conteúdo sensível desnecessário").
 * `consomeCota` é gravado junto ao registro para countInteractions()
 * poder filtrar por ele (rate limit não deve ser inflado por falhas de
 * configuração/autenticação/infraestrutura — ver limiter.ts).
 */
export async function recordAtlasAudit(
  session: AuthSession,
  repository: Repository,
  params: {
    entidade: string;
    entidadeId: string;
    descricao: string;
    status: "sucesso" | "falha";
    consomeCota: boolean;
    provider?: string;
    model: string;
    responseId?: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    question?: string;
    errorCode?: string;
  },
): Promise<void> {
  await repository.audit.record(session, {
    acao: "interacao_ia",
    entidade: params.entidade,
    entidadeId: params.entidadeId,
    descricao: params.descricao,
    metadados: {
      status: params.status,
      consomeCota: params.consomeCota,
      provedor: params.provider ?? "openai",
      modelo: params.model,
      ...(params.responseId ? { responseId: params.responseId } : {}),
      tokensEntrada: params.inputTokens,
      tokensSaida: params.outputTokens,
      tokensTotal: params.inputTokens + params.outputTokens,
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
