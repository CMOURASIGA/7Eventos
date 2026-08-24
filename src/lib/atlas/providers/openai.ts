import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { AtlasProviderError } from "../errors";
import type {
  AtlasAIProvider,
  AtlasTextRequest,
  AtlasTextResult,
  AtlasStructuredRequest,
  AtlasStructuredResult,
} from "./types";

const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_REASONING_EFFORT = "low";

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

export function createOpenAIProvider(): AtlasAIProvider {
  return { name: "openai", generateText, generateStructured };
}
