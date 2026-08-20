"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { Role, UserStatus } from "@/lib/domain/types";

const AVATAR_COLORS = ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#0f172a"];

export async function createUser(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "consulta") as Role;

  if (!nome || !email) {
    redirect(`/administracao/usuarios?error=${encodeURIComponent("Informe nome e e-mail.")}`);
  }

  const existing = await repository.users.getByEmail(email);
  if (existing) {
    redirect(`/administracao/usuarios?error=${encodeURIComponent("Já existe um usuário com este e-mail.")}`);
  }

  try {
    await repository.users.create(session, {
      nome,
      email,
      perfil,
      status: "ativo",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    });
    revalidatePath("/administracao/usuarios");
    redirect("/administracao/usuarios?created=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/administracao/usuarios?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function setUserStatus(id: string, status: UserStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.users.update(session, id, { status });
  revalidatePath("/administracao/usuarios");
}

export async function setUserRole(id: string, perfil: Role): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.users.update(session, id, { perfil });
  revalidatePath("/administracao/usuarios");
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
