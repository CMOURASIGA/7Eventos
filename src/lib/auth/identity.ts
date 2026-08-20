import type { User } from "@/lib/domain/types";
import { getDataMode } from "@/lib/data";

/**
 * Resolução de identidade a partir de um `userId` já autenticado
 * (cookie de sessão validado). Não faz parte da interface `Repository`
 * de propósito: todo método ali exige uma `AuthSession` (empresa +
 * perfil já conhecidos) para impor isolamento, o que ainda não existe
 * neste ponto do fluxo — aqui é exatamente onde a sessão é construída.
 */
export async function resolveUserById(userId: string): Promise<User | null> {
  if (getDataMode() === "supabase") {
    const { getSupabaseServiceClient } = await import("@/lib/data/supabase/client");
    const { mapUser } = await import("@/lib/data/supabase/mappers");
    const db = getSupabaseServiceClient();
    const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    return mapUser(data);
  }

  const { getStore } = await import("@/lib/data/mock/store");
  const store = getStore();
  return store.users.find((u) => u.id === userId) ?? null;
}
