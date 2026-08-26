import type { Repository } from "./repository";
import { mockRepository } from "./mock/repository";

export type DataMode = "mock" | "supabase";

/**
 * Ponto único de acesso à camada de dados.
 *
 * `DATA_MODE` decide a fonte:
 * - `mock` (padrão fora de Production): estado em memória com dados
 *   ricos para desenvolvimento e demonstração. Reinicia a cada novo
 *   processo do servidor.
 * - `supabase`: Postgres/Supabase oficial (branch `main`, quando o
 *   projeto estiver provisionado — ver docs/architecture/DATABASE.md).
 *
 * Nenhuma tela ou server action deve importar `mock/*` ou `supabase/*`
 * diretamente: sempre importar `getRepository()` daqui.
 */
export function getDataMode(): DataMode {
  const mode = process.env.DATA_MODE?.toLowerCase();
  if (process.env.VERCEL_ENV === "production" && mode !== "supabase") {
    throw new Error("Configuração segura exigida: DATA_MODE=supabase no ambiente Production.");
  }
  return mode === "supabase" ? "supabase" : "mock";
}

let cached: Repository | null = null;
let cachedMode: DataMode | null = null;

export function getRepository(): Repository {
  const mode = getDataMode();
  if (cached && cachedMode === mode) return cached;

  if (mode === "supabase") {
    // Import tardio: evita exigir variáveis de ambiente do Supabase
    // quando o app roda em modo mock (padrão do ambiente de demonstração).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = (require("./supabase/repository") as typeof import("./supabase/repository")).supabaseRepository;
  } else {
    cached = mockRepository;
  }
  cachedMode = mode;
  return cached;
}

export type { Repository } from "./repository";
