"use server";

import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { BudgetItemStatus } from "@/lib/domain/types";

function parseValor(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function addBudgetItem(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!categoria || !descricao) return;

  await repository.budgetItems.create(session, {
    eventId,
    categoria,
    supplierId: String(formData.get("supplierId") ?? "") || undefined,
    descricao,
    valorCotado: parseValor(formData, "valorCotado"),
    valorContratado: parseValor(formData, "valorContratado"),
    valorRealizado: parseValor(formData, "valorRealizado"),
    status: (String(formData.get("status") ?? "previsto") as BudgetItemStatus),
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateBudgetItemValues(eventId: string, itemId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.budgetItems.update(session, itemId, {
    valorCotado: parseValor(formData, "valorCotado"),
    valorContratado: parseValor(formData, "valorContratado"),
    valorRealizado: parseValor(formData, "valorRealizado"),
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateBudgetItemStatus(eventId: string, itemId: string, status: BudgetItemStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.budgetItems.update(session, itemId, { status });
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeBudgetItem(eventId: string, itemId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.budgetItems.remove(session, itemId);
  revalidatePath(`/eventos/${eventId}`);
}
