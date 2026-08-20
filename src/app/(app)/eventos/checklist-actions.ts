"use server";

import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { ChecklistStatus } from "@/lib/domain/types";

export async function addChecklistItem(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;

  await repository.checklist.create(session, {
    eventId,
    titulo,
    categoria: String(formData.get("categoria") ?? "") || "Geral",
    responsavelId: String(formData.get("responsavelId") ?? "") || undefined,
    prazo: String(formData.get("prazo") ?? "") || undefined,
    status: "pendente",
    observacao: String(formData.get("observacao") ?? "") || undefined,
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function setChecklistItemStatus(eventId: string, itemId: string, status: ChecklistStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.checklist.update(session, itemId, { status });
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeChecklistItem(eventId: string, itemId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.checklist.remove(session, itemId);
  revalidatePath(`/eventos/${eventId}`);
}
