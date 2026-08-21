import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Atlas (Fase 3) - camada "chamada ao modelo" (docs/FASE_03_ATLAS.md
 * seção 12). Isolada do resto da aplicação: nenhum outro módulo importa
 * "@anthropic-ai/sdk" diretamente.
 *
 * ANTHROPIC_API_KEY ainda não foi provisionada em nenhum ambiente deste
 * projeto (mesmo raciocínio de SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY em
 * src/lib/data/supabase/client.ts): Atlas fica disponível na interface,
 * mas indisponível funcionalmente, até a chave ser configurada. Nunca
 * lança/derruba a página do evento por falta de chave — quem chama
 * checa isAtlasConfigured() antes.
 */

export const ATLAS_MODEL = "claude-opus-5";

export function isAtlasConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class AtlasNotConfiguredError extends Error {
  constructor() {
    super("Atlas não está configurado nesta implantação (ANTHROPIC_API_KEY ausente).");
    this.name = "AtlasNotConfiguredError";
  }
}

let cachedClient: Anthropic | null = null;

/** Lança AtlasNotConfiguredError se a chave não estiver presente — chame isAtlasConfigured() antes para checar sem lançar. */
export function getAtlasClient(): Anthropic {
  if (!isAtlasConfigured()) {
    throw new AtlasNotConfiguredError();
  }
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}
