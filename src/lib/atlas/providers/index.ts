import "server-only";
import { AtlasNotConfiguredError } from "../errors";
import { createOpenAIProvider } from "./openai";
import type { AtlasAIProvider } from "./types";

/**
 * Fábrica do provedor de IA do Atlas, selecionado por ATLAS_AI_PROVIDER
 * (hoje só "openai" é implementado — mantemos a variável mesmo assim
 * para não exigir nova refatoração se um segundo provedor for avaliado
 * no futuro). Nenhum outro módulo do Atlas importa o SDK de um provedor
 * diretamente; tudo passa por aqui.
 */
function getProviderName(): string {
  return (process.env.ATLAS_AI_PROVIDER?.trim() || "openai").toLowerCase();
}

export function isAtlasConfigured(): boolean {
  const providerName = getProviderName();
  if (providerName === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

let cachedProvider: AtlasAIProvider | null = null;

/** Lança AtlasNotConfiguredError se o provedor não estiver configurado — chame isAtlasConfigured() antes para checar sem lançar. */
export function getAtlasProvider(): AtlasAIProvider {
  if (!isAtlasConfigured()) throw new AtlasNotConfiguredError();
  if (!cachedProvider) {
    const providerName = getProviderName();
    if (providerName !== "openai") throw new AtlasNotConfiguredError();
    cachedProvider = createOpenAIProvider();
  }
  return cachedProvider;
}
