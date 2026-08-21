"use server";

import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { askAtlas } from "@/lib/atlas/chat";
import { generateExecutiveSummary, type AtlasSummary } from "@/lib/atlas/summary";
import { AtlasNotConfiguredError } from "@/lib/atlas/client";
import type { AtlasChatTurn } from "@/lib/atlas/types";

/**
 * Server Actions do Atlas — chamadas via useTransition pelo componente de
 * chat (não <form action=...> comum), por isso retornam um resultado
 * tipado em vez de fazer redirect em caso de erro: a UI de chat precisa
 * mostrar a falha inline, sem navegar para longe da conversa.
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

function atlasErrorMessage(err: unknown): string {
  if (err instanceof AtlasNotConfiguredError) return err.message;
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}
