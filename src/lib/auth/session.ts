import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession, User } from "@/lib/domain/types";
import { verifyToken } from "./token";
import { resolveUserById } from "./identity";

export const SESSION_COOKIE = "7ev_session";

/** Lê e valida a sessão atual. Retorna `null` quando não autenticado. */
export async function getAuthSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await resolveUserById(payload.userId);
  if (!user || user.status !== "ativo") return null;

  return { userId: user.id, companyId: user.companyId, perfil: user.perfil };
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getAuthSession();
  if (!session) return null;
  return resolveUserById(session.userId);
}

/** Usa em páginas/layouts protegidos: redireciona para /login quando não autenticado. */
export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  return session;
}
