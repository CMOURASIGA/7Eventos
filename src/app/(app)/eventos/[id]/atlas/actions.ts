"use server";

import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { askAtlas } from "@/lib/atlas/chat";
import { generateExecutiveSummary, type AtlasSummary } from "@/lib/atlas/summary";
import { AtlasNotConfiguredError, AtlasValidationError, AtlasProviderError } from "@/lib/atlas/errors";
import { AtlasRateLimitError } from "@/lib/atlas/limiter";
import type { AtlasChatTurn } from "@/lib/atlas/types";

/**
 * Server Actions do Atlas — chamadas via useTransition pelo componente de
 * chat (não <form action=...> comum), por isso retornam um resultado
 * tipado em vez de fazer redirect em caso de erro: a UI de chat precisa
 * mostrar a falha inline, sem navegar para longe da conversa.
 *
 * Sanitização de erros (apontada pelo validador): só as classes de erro
 * do próprio Atlas — escritas por nós, com mensagens já pensadas para o
 * usuário final (AtlasProviderError inclusive: o provedor já traduz o
 * erro do SDK para uma mensagem segura antes de lançar) — têm a
 * mensagem repassada à UI. Qualquer outro erro (SDK não mapeado, rede,
 * parsing inesperado) vira uma mensagem genérica; o detalhe completo só
 * vai para o log do servidor, nunca para o cliente.
 */

export type AskAtlasResult = { ok: true; resposta: string } | { ok: false; error: string };

export async function askAtlasAction(
  eventId: string,
  question: string,
  history: AtlasChatTurn[],
): Promise<AskAtlasResult> {
  const session = await requireAuthSession();
  const repository = getRepository();
  try {
    const { resposta } = await askAtlas(session, eventId, question, history, repository);
    return { ok: true, resposta };
  } catch (err) {
    return { ok: false, error: atlasErrorMessage(err) };
  }
}

export type GenerateSummaryResult = { ok: true; summary: AtlasSummary } | { ok: false; error: string };

export async function generateSummaryAction(eventId: string): Promise<GenerateSummaryResult> {
  const session = await requireAuthSession();
  const repository = getRepository();
  try {
    const summary = await generateExecutiveSummary(session, eventId, repository);
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: atlasErrorMessage(err) };
  }
}

const GENERIC_ERROR_MESSAGE = "Não foi possível concluir a operação com o Atlas agora. Tente novamente em instantes.";

function atlasErrorMessage(err: unknown): string {
  if (err instanceof AtlasNotConfiguredError) return err.message;
  if (err instanceof AtlasRateLimitError) return err.message;
  if (err instanceof AtlasValidationError) return err.message;
  if (err instanceof AtlasProviderError) return err.message;
  // Erro inesperado (SDK não mapeado, rede, parsing): nunca expor
  // err.message ao cliente — pode carregar detalhe técnico interno. O
  // log completo fica só no servidor.
  console.error("[atlas] erro inesperado:", err);
  return GENERIC_ERROR_MESSAGE;
}
