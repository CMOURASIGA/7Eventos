import "server-only";
import type { ZodType } from "zod";
import type { AtlasChatTurn } from "../types";

/**
 * Atlas (Fase 3) - abstração de provedor de IA. chat.ts e summary.ts só
 * conhecem esta interface, nunca o SDK de um provedor específico — a
 * escolha do provedor (hoje OpenAI) fica isolada em providers/*.ts, para
 * poder trocar sem tocar em contexto, autorização, rate limit, auditoria
 * ou UI (docs/FASE_03_ATLAS.md seção 12: "separar... chamada ao
 * modelo... validação da resposta").
 */

export interface AtlasTextRequest {
  systemPrompt: string;
  /** Histórico + pergunta atual, já validados (ver chat.ts). Último turno é sempre role "user". */
  messages: AtlasChatTurn[];
  maxOutputTokens: number;
}

export interface AtlasTextResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  responseId?: string;
}

export interface AtlasStructuredRequest<T> {
  systemPrompt: string;
  userMessage: string;
  schema: ZodType<T>;
  /** Nome visível ao modelo para o schema gerado (ex: "atlas_summary"). */
  schemaName: string;
  maxOutputTokens: number;
}

export interface AtlasStructuredResult<T> {
  data: T;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  responseId?: string;
}

export interface AtlasAIProvider {
  readonly name: string;
  /** Sempre lança AtlasProviderError em caso de falha — nunca deixa vazar o erro nativo do SDK. */
  generateText(input: AtlasTextRequest): Promise<AtlasTextResult>;
  /** Sempre lança AtlasProviderError em caso de falha — nunca deixa vazar o erro nativo do SDK. */
  generateStructured<T>(input: AtlasStructuredRequest<T>): Promise<AtlasStructuredResult<T>>;
}
