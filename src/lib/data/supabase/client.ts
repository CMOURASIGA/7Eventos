import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para o ambiente oficial (DATA_MODE=supabase).
 *
 * Requer as variáveis de ambiente abaixo (ver `.env.example`). Enquanto
 * o projeto Supabase não é provisionado, `DATA_MODE` deve permanecer
 * `mock` — ver docs/architecture/DATABASE.md.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas. Defina DATA_MODE=mock ou configure o Supabase (docs/architecture/DATABASE.md).",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
