import "server-only";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";

/**
 * Atlas (Fase 3) - proteção contra consumo abusivo (docs/FASE_03_ATLAS.md
 * seção 13 "controle de consumo"), apontada como bloqueador pelo
 * validador: antes desta correção, qualquer perfil com view_event podia
 * gerar resumos/perguntas sem limite, consumindo a chave paga da
 * empresa sem controle.
 *
 * Duas categorias de limite, cada uma com a ferramenta certa:
 * - Cooldown entre chamadas e trava de concorrência: coordenação em
 *   tempo real, correta em memória de processo (globalThis, mesmo
 *   padrão de src/lib/data/mock/store.ts para sobreviver a hot-reload).
 *   Limitação conhecida: é por instância/processo, não distribuída —
 *   aceitável para a escala atual; evoluir para um store compartilhado
 *   (ex: Redis) quando houver tráfego real de produção.
 * - Limites diários por usuário/empresa: contagem histórica, correta
 *   via repository.audit.countInteractions (persistido — mock ou
 *   Supabase —, funciona entre reinícios/instâncias).
 */

const MIN_INTERVAL_MS = Number(process.env.ATLAS_MIN_INTERVAL_MS) || 3000;
const DAILY_LIMIT_PER_USER = Number(process.env.ATLAS_DAILY_LIMIT_PER_USER) || 30;
const DAILY_LIMIT_PER_COMPANY = Number(process.env.ATLAS_DAILY_LIMIT_PER_COMPANY) || 300;

export class AtlasRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasRateLimitError";
  }
}

declare global {
  var __atlasLimiterState:
    | {
        lastCallAtByUser: Map<string, number>;
        inFlightByUser: Set<string>;
      }
    | undefined;
}

function getState() {
  if (!globalThis.__atlasLimiterState) {
    globalThis.__atlasLimiterState = { lastCallAtByUser: new Map(), inFlightByUser: new Set() };
  }
  return globalThis.__atlasLimiterState;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Verifica todos os limites e, se liberado, marca o usuário como "em
 * chamada" (trava de concorrência). Chame releaseAtlasCall() no
 * finally, sempre, mesmo em caso de erro.
 */
export async function acquireAtlasCall(session: AuthSession, repository: Repository): Promise<void> {
  const state = getState();
  const userId = session.userId;

  if (state.inFlightByUser.has(userId)) {
    throw new AtlasRateLimitError("Você já tem uma pergunta em andamento no Atlas. Aguarde a resposta antes de enviar outra.");
  }

  const lastCallAt = state.lastCallAtByUser.get(userId);
  if (lastCallAt != null && Date.now() - lastCallAt < MIN_INTERVAL_MS) {
    throw new AtlasRateLimitError("Você está enviando perguntas rápido demais. Aguarde alguns segundos e tente novamente.");
  }

  const { totalCompany, totalUser } = await repository.audit.countInteractions(session, {
    acao: "interacao_ia",
    sinceIso: startOfTodayIso(),
  });
  if (totalUser >= DAILY_LIMIT_PER_USER) {
    throw new AtlasRateLimitError(`Você atingiu o limite diário de uso do Atlas (${DAILY_LIMIT_PER_USER} interações). Tente novamente amanhã.`);
  }
  if (totalCompany >= DAILY_LIMIT_PER_COMPANY) {
    throw new AtlasRateLimitError("O limite diário de uso do Atlas para sua empresa foi atingido. Tente novamente amanhã.");
  }

  state.inFlightByUser.add(userId);
  state.lastCallAtByUser.set(userId, Date.now());
}

export function releaseAtlasCall(session: AuthSession): void {
  getState().inFlightByUser.delete(session.userId);
}
