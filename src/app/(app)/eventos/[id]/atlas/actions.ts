"use server";

import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { askAtlas } from "@/lib/atlas/chat";
import { generateExecutiveSummary, type AtlasSummary } from "@/lib/atlas/summary";
import { transcribeVoiceInput, synthesizeVoiceResponse } from "@/lib/atlas/voice";
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
  source: "texto" | "voz" = "texto",
): Promise<AskAtlasResult> {
  const session = await requireAuthSession();
  const repository = getRepository();
  try {
    const { resposta } = await askAtlas(session, eventId, question, history, repository, source);
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

/**
 * Voice Room (seção 11). transcribeVoiceAction recebe o áudio gravado no
 * navegador via FormData (mesmo padrão de upload já usado em documentos
 * — ver eventos/[id]/page.tsx) e devolve o texto transcrito.
 * synthesizeVoiceAction recebe o texto que askAtlasAction já retornou e
 * devolve o áudio em base64 (Server Actions não retornam binário bruto
 * de forma confiável — o cliente decodifica para Blob antes de tocar).
 */
export type TranscribeVoiceResult = { ok: true; transcript: string } | { ok: false; error: string };

export async function transcribeVoiceAction(eventId: string, formData: FormData): Promise<TranscribeVoiceResult> {
  const session = await requireAuthSession();
  const repository = getRepository();
  try {
    const audio = formData.get("audio");
    if (!(audio instanceof Blob)) {
      return { ok: false, error: "Áudio não recebido corretamente. Tente gravar novamente." };
    }
    const buffer = await audio.arrayBuffer();
    const mimeType = audio instanceof File && audio.type ? audio.type : "audio/webm";
    const transcript = await transcribeVoiceInput(session, eventId, repository, buffer, mimeType);
    return { ok: true, transcript };
  } catch (err) {
    return { ok: false, error: atlasErrorMessage(err) };
  }
}

export type SynthesizeVoiceResult = { ok: true; audioBase64: string; contentType: string } | { ok: false; error: string };

export async function synthesizeVoiceAction(eventId: string, text: string): Promise<SynthesizeVoiceResult> {
  const session = await requireAuthSession();
  const repository = getRepository();
  try {
    const { audioBuffer, contentType } = await synthesizeVoiceResponse(session, eventId, repository, text);
    return { ok: true, audioBase64: Buffer.from(audioBuffer).toString("base64"), contentType };
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
