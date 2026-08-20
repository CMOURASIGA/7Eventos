"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createSpace(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const capacidade = Number(formData.get("capacidade") ?? 0);

  if (!nome || !local || !Number.isFinite(capacidade) || capacidade < 0) {
    redirect(`/espacos/novo?error=${encodeURIComponent("Preencha nome, local e capacidade válida.")}`);
  }

  try {
    const space = await repository.spaces.create(session, {
      nome,
      local,
      capacidade,
      status: "ativo",
      descricao: String(formData.get("descricao") ?? "") || undefined,
      caracteristicas: parseList(formData.get("caracteristicas")),
      equipamentos: parseList(formData.get("equipamentos")),
      observacoes: String(formData.get("observacoes") ?? "") || undefined,
    });
    revalidatePath("/espacos");
    redirect(`/espacos/${space.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/espacos/novo?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function updateSpace(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const capacidade = Number(formData.get("capacidade") ?? 0);

  try {
    await repository.spaces.update(session, id, {
      nome,
      local,
      capacidade,
      descricao: String(formData.get("descricao") ?? "") || undefined,
      caracteristicas: parseList(formData.get("caracteristicas")),
      equipamentos: parseList(formData.get("equipamentos")),
      observacoes: String(formData.get("observacoes") ?? "") || undefined,
    });
    revalidatePath("/espacos");
    revalidatePath(`/espacos/${id}`);
    redirect(`/espacos/${id}?updated=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/espacos/${id}?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function setSpaceStatus(id: string, status: "ativo" | "inativo"): Promise<void> {
  "use server";
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.spaces.setStatus(session, id, status);
  revalidatePath("/espacos");
  revalidatePath(`/espacos/${id}`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
