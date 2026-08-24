import "server-only";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { zodTextFormat } from "openai/helpers/zod";
import { AtlasProviderError } from "../errors";
import type {
  AtlasAIProvider,
  AtlasTextRequest,
  AtlasTextResult,
  AtlasStructuredRequest,
  AtlasStructuredResult,
  AtlasTranscribeRequest,
  AtlasTranscribeResult,
  AtlasSpeechRequest,
  AtlasSpeechResult,
} from "./types";

const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_REASONING_EFFORT = "low";
const DEFAULT_STT_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "sage";

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function getReasoningEffort(): OpenAI.Reasoning["effort"] {
  const value = process.env.OPENAI_REASONING_EFFORT?.trim();
  const allowed = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
  return (allowed as readonly string[]).includes(value ?? "")
    ? (value as OpenAI.Reasoning["effort"])
    : DEFAULT_REASONING_EFFORT;
}

function getSttModel(): string {
  return process.env.OPENAI_STT_MODEL?.trim() || DEFAULT_STT_MODEL;
}

function getTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
}

function getTtsVoice(): string {
  return process.env.OPENAI_TTS_VOICE?.trim() || DEFAULT_TTS_VOICE;
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 30000,
      maxRetries: Number(process.env.OPENAI_MAX_RETRIES) || 1,
    });
  }
  return cachedClient;
}

/**
 * Traduz qualquer falha (erro do SDK ou uma condição da própria
 * resposta, como recusa/resposta vazia) para AtlasProviderError com uma
 * mensagem já segura para a UI e a classificação usada pelo rate limit
 * (seção 13 - "erro de configuração/autenticação/infraestrutura não
 * deveria consumir a cota funcional do usuário").
 */
function wrapSdkError(err: unknown): AtlasProviderError {
  if (err instanceof AtlasProviderError) return err;
  if (err instanceof OpenAI.AuthenticationError) {
    return new AtlasProviderError("Não foi possível autenticar com o provedor de IA. Verifique a configuração.", "auth_error", false);
  }
  if (err instanceof OpenAI.PermissionDeniedError) {
    return new AtlasProviderError("Acesso negado pelo provedor de IA. Verifique a configuração de rede/permissões.", "permission_denied", false);
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new AtlasProviderError(
      "O Atlas está temporariamente indisponível (limite do provedor de IA atingido). Tente novamente em alguns instantes.",
      "provider_rate_limit",
      false,
    );
  }
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return new AtlasProviderError("O Atlas demorou demais para responder. Tente novamente.", "timeout", false);
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new AtlasProviderError("Não foi possível conectar ao provedor de IA agora. Tente novamente em instantes.", "connection_error", false);
  }
  if (err instanceof OpenAI.InternalServerError) {
    return new AtlasProviderError("O provedor de IA está com instabilidade agora. Tente novamente em instantes.", "provider_5xx", false);
  }
  if (err instanceof OpenAI.BadRequestError) {
    return new AtlasProviderError("Não foi possível processar essa solicitação com o Atlas.", "bad_request", false);
  }
  if (err instanceof OpenAI.APIError) {
    return new AtlasProviderError("Não foi possível concluir a operação com o Atlas agora.", "provider_api_error", false);
  }
  return new AtlasProviderError("Não foi possível concluir a operação com o Atlas agora.", "unknown_provider_error", false);
}

function findRefusal(response: OpenAI.Responses.Response): string | null {
  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const block of item.content ?? []) {
        if (block.type === "refusal") return block.refusal;
      }
    }
  }
  return null;
}

async function generateText(input: AtlasTextRequest): Promise<AtlasTextResult> {
  const client = getClient();
  const model = getModel();
  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model,
      instructions: input.systemPrompt,
      input: input.messages.map((turn) => ({ role: turn.role, content: turn.content })),
      reasoning: { effort: getReasoningEffort() },
      max_output_tokens: input.maxOutputTokens,
    });
  } catch (err) {
    throw wrapSdkError(err);
  }

  // Recusa/resposta vazia/incompleta são tratadas explicitamente (seção
  // 5 do relato do validador: "tratar resposta vazia e recusa do modelo
  // explicitamente") — chegaram ao modelo de verdade, então consomeCota
  // é true, ao contrário das falhas de config/auth/infra acima.
  if (findRefusal(response)) {
    throw new AtlasProviderError("O Atlas não conseguiu responder essa pergunta desta vez.", "model_refusal", true);
  }
  const text = response.output_text?.trim();
  if (response.status !== "completed" || !text) {
    throw new AtlasProviderError(
      "O Atlas não retornou uma resposta desta vez. Tente reformular a pergunta.",
      response.status === "incomplete" ? "incomplete_response" : "empty_response",
      true,
    );
  }

  return {
    text,
    provider: "openai",
    model: response.model || model,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    responseId: response.id,
  };
}

async function generateStructured<T>(input: AtlasStructuredRequest<T>): Promise<AtlasStructuredResult<T>> {
  const client = getClient();
  const model = getModel();
  let response;
  try {
    response = await client.responses.parse({
      model,
      instructions: input.systemPrompt,
      input: [{ role: "user", content: input.userMessage }],
      reasoning: { effort: getReasoningEffort() },
      max_output_tokens: input.maxOutputTokens,
      text: { format: zodTextFormat(input.schema, input.schemaName) },
    });
  } catch (err) {
    throw wrapSdkError(err);
  }

  if (findRefusal(response)) {
    throw new AtlasProviderError("O Atlas não conseguiu gerar o resumo executivo desta vez.", "model_refusal", true);
  }
  if (response.status !== "completed" || !response.output_parsed) {
    throw new AtlasProviderError(
      "O Atlas não conseguiu montar o resumo executivo desta vez.",
      response.status === "incomplete" ? "incomplete_response" : "empty_response",
      true,
    );
  }

  return {
    data: response.output_parsed,
    provider: "openai",
    model: response.model || model,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    responseId: response.id,
  };
}

/**
 * Voice Room (seção 11) - fala do usuário -> texto, via Whisper
 * (client.audio.transcriptions.create). O áudio nunca é persistido —
 * chega em memória, vira texto, e o buffer é descartado ao final desta
 * função (mesma regra de "minimizar contexto"/"evitar persistir conteúdo
 * sensível desnecessário" das seções 9/14).
 */
async function transcribeAudio(input: AtlasTranscribeRequest): Promise<AtlasTranscribeResult> {
  const client = getClient();
  const model = getSttModel();
  let response: OpenAI.Audio.Transcriptions.Transcription;
  try {
    const file = await toFile(Buffer.from(input.audioBuffer), `voice-input.${inferAudioExtension(input.mimeType)}`, {
      type: input.mimeType || "audio/webm",
    });
    response = await client.audio.transcriptions.create({ file, model, language: "pt" });
  } catch (err) {
    throw wrapSdkError(err);
  }

  const text = response.text?.trim();
  if (!text) {
    throw new AtlasProviderError("Não foi possível entender o áudio. Tente falar novamente.", "empty_response", true);
  }

  return { text, provider: "openai", model };
}

function inferAudioExtension(mimeType: string): string {
  const value = mimeType.toLowerCase();
  if (value.includes("webm")) return "webm";
  if (value.includes("wav")) return "wav";
  if (value.includes("mpeg") || value.includes("mp3")) return "mp3";
  if (value.includes("ogg")) return "ogg";
  if (value.includes("mp4")) return "mp4";
  return "webm";
}

/**
 * Voice Room (seção 11) - resposta do Atlas -> áudio, via
 * client.audio.speech.create. Recebe o texto já gerado por askAtlas()
 * (mesmo "cérebro" do chat de texto) — esta função só converte para voz.
 */
async function synthesizeSpeech(input: AtlasSpeechRequest): Promise<AtlasSpeechResult> {
  const client = getClient();
  const model = getTtsModel();
  let response: Response;
  try {
    response = await client.audio.speech.create({
      model,
      voice: getTtsVoice() as OpenAI.Audio.SpeechCreateParams["voice"],
      input: input.text,
      response_format: "mp3",
    });
  } catch (err) {
    throw wrapSdkError(err);
  }

  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength === 0) {
    throw new AtlasProviderError("O Atlas não conseguiu gerar o áudio da resposta desta vez.", "empty_response", true);
  }

  return { audioBuffer, contentType: "audio/mpeg", provider: "openai", model };
}

export function createOpenAIProvider(): AtlasAIProvider {
  return { name: "openai", generateText, generateStructured, transcribeAudio, synthesizeSpeech };
}
