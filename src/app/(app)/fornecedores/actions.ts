"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function createSupplier(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  if (!nome || !categoria) {
    redirect(`/fornecedores/novo?error=${encodeURIComponent("Preencha ao menos nome e categoria.")}`);
  }

  try {
    const supplier = await repository.suppliers.create(session, {
      nome,
      categoria,
      documento: String(formData.get("documento") ?? "") || undefined,
      contato: String(formData.get("contato") ?? "") || undefined,
      servicos: String(formData.get("servicos") ?? "") || undefined,
      status: "ativo",
      observacoes: String(formData.get("observacoes") ?? "") || undefined,
    });
    revalidatePath("/fornecedores");
    redirect(`/fornecedores/${supplier.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/fornecedores/novo?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function updateSupplier(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  try {
    await repository.suppliers.update(session, id, {
      nome,
      categoria,
      documento: String(formData.get("documento") ?? "") || undefined,
      contato: String(formData.get("contato") ?? "") || undefined,
      servicos: String(formData.get("servicos") ?? "") || undefined,
      observacoes: String(formData.get("observacoes") ?? "") || undefined,
    });
    revalidatePath("/fornecedores");
    revalidatePath(`/fornecedores/${id}`);
    redirect(`/fornecedores/${id}?updated=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/fornecedores/${id}?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function setSupplierStatus(id: string, status: "ativo" | "inativo"): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.suppliers.setStatus(session, id, status);
  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
