"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataMode } from "@/lib/data";
import { signToken } from "./token";
import { SESSION_COOKIE } from "./session";
import { resolveUserById } from "./identity";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

async function establishSession(userId: string) {
  const token = await signToken({ userId, issuedAt: Date.now() });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Login do ambiente de demonstração (DATA_MODE=mock): não exige senha,
 * apenas seleção de um usuário semeado — a tela deixa claro que é um
 * ambiente de demonstração. Nunca deve ficar disponível quando
 * DATA_MODE=supabase. Sempre redireciona (sucesso -> /dashboard, falha
 * -> /login?error=...), nunca retorna um valor: é usada diretamente
 * como `action` de `<form>`.
 */
export async function loginAsDemoUser(userId: string): Promise<void> {
  if (getDataMode() !== "mock") {
    redirect(`/login?error=${encodeURIComponent("Login de demonstração indisponível neste ambiente.")}`);
  }
  const user = await resolveUserById(userId);
  if (!user || user.status !== "ativo") {
    redirect(`/login?error=${encodeURIComponent("Usuário de demonstração inválido ou inativo.")}`);
  }
  await establishSession(user.id);
  redirect("/dashboard");
}

/**
 * Login oficial (DATA_MODE=supabase): valida e-mail/senha via Supabase
 * Auth. `profiles.id` referencia `auth.users.id`, então a sessão da
 * aplicação passa a se basear no mesmo identificador.
 */
export async function loginWithPassword(email: string, password: string): Promise<void> {
  if (getDataMode() !== "supabase") {
    redirect(`/login?error=${encodeURIComponent("Login com senha indisponível neste ambiente (modo demonstração ativo).")}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    redirect(`/login?error=${encodeURIComponent("Supabase não configurado neste ambiente.")}`);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  }

  const user = await resolveUserById(data.user.id);
  if (!user || user.status !== "ativo") {
    redirect(`/login?error=${encodeURIComponent("Usuário sem perfil ativo no 7Eventos.")}`);
  }

  await establishSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
