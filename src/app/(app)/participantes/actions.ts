"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function createParticipant(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!nome || !email) {
    redirect(`/participantes/novo?error=${encodeURIComponent("Preencha ao menos nome e e-mail.")}`);
  }

  try {
    const participant = await repository.participants.create(session, {
      nome,
      email,
      telefone: String(formData.get("telefone") ?? "") || undefined,
      organizacao: String(formData.get("organizacao") ?? "") || undefined,
      categoria: String(formData.get("categoria") ?? "") || undefined,
      status: "ativo",
      observacoes: String(formData.get("observacoes") ?? "") || undefined,
    });
    revalidatePath("/participantes");
    redirect(`/participantes/${participant.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/participantes/novo?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function updateParticipant(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  try {
    await repository.participants.update(session, id, {
      nome,
      email,
      telefone: String(formData.get("telefone") ?? "") || undefined,
      organizacao: String(formData.get("organizacao") ?? "") || undefined,
      categoria: String(formData.get("categoria") ?? "") || undefined,
      observacoes: String(formData.get("observacoes") ?? "") || undefined,
    });
    revalidatePath("/participantes");
    revalidatePath(`/participantes/${id}`);
    redirect(`/participantes/${id}?updated=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/participantes/${id}?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function setParticipantStatus(id: string, status: "ativo" | "inativo"): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.participants.setStatus(session, id, status);
  revalidatePath("/participantes");
  revalidatePath(`/participantes/${id}`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
