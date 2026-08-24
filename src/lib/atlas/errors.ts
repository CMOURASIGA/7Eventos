import "server-only";

/**
 * Atlas (Fase 3) - classes de erro compartilhadas entre a camada de
 * domínio (chat.ts/summary.ts/limiter.ts) e os provedores de IA
 * (providers/*.ts). Centralizadas aqui para não criar import cruzado
 * entre chat.ts e summary.ts, e para dar às Server Actions
 * (eventos/[id]/atlas/actions.ts) um único lugar para decidir quais
 * mensagens de erro são seguras para chegar à UI.
 */

export class AtlasNotConfiguredError extends Error {
  constructor() {
    super("Atlas não está configurado nesta implantação.");
    this.name = "AtlasNotConfiguredError";
  }
}

export class AtlasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasValidationError";
  }
}

/**
 * Erro de um provedor de IA (ex: OpenAI), já traduzido para uma
 * mensagem segura para o usuário final no momento em que é lançado —
 * quem captura este erro (chat.ts/summary.ts/actions.ts) pode repassar
 * `.message` para a UI sem risco de vazar detalhe do SDK.
 *
 * `consomeCota` distingue "tentativa que chegou ao modelo" (sucesso,
 * recusa, resposta vazia/incompleta — deve contar para o limite diário)
 * de "falha de configuração/autenticação/infraestrutura" (nunca chegou
 * a processar de fato — não deve consumir a cota funcional do usuário,
 * mas continua auditada).
 */
export class AtlasProviderError extends Error {
  constructor(
    message: string,
    public readonly codigoErro: string,
    public readonly consomeCota: boolean,
  ) {
    super(message);
    this.name = "AtlasProviderError";
  }
}

/** Classifica qualquer erro capturado em { codigoErro, consomeCota } para a auditoria (seção 14) e o rate limit (seção 13). */
export function classifyAtlasError(err: unknown): { codigoErro: string; consomeCota: boolean } {
  if (err instanceof AtlasProviderError) return { codigoErro: err.codigoErro, consomeCota: err.consomeCota };
  if (err instanceof AtlasValidationError) return { codigoErro: "validation_error", consomeCota: false };
  if (err instanceof AtlasNotConfiguredError) return { codigoErro: "not_configured", consomeCota: false };
  return { codigoErro: "unknown_error", consomeCota: false };
}
