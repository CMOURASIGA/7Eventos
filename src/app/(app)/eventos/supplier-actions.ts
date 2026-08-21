"use server";

import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { EventSupplierSituacao } from "@/lib/domain/types";

export async function linkSupplierToEvent(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const supplierId = String(formData.get("supplierId") ?? "");
  const servico = String(formData.get("servico") ?? "").trim();
  if (!supplierId || !servico) return;

  const valorPrevistoRaw = formData.get("valorPrevisto");
  const valorPrevisto = valorPrevistoRaw ? Number(valorPrevistoRaw) : undefined;
  const valorContratadoRaw = formData.get("valorContratado");
  const valorContratado = valorContratadoRaw ? Number(valorContratadoRaw) : undefined;

  await repository.eventSuppliers.create(session, {
    eventId,
    supplierId,
    servico,
    responsavelInternoId: String(formData.get("responsavelInternoId") ?? "") || undefined,
    valorPrevisto: Number.isFinite(valorPrevisto) ? valorPrevisto : undefined,
    valorContratado: Number.isFinite(valorContratado) ? valorContratado : undefined,
    situacao: (String(formData.get("situacao") ?? "previsto") as EventSupplierSituacao),
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateEventSupplierSituacao(
  eventId: string,
  linkId: string,
  situacao: EventSupplierSituacao,
): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.eventSuppliers.update(session, linkId, { situacao });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateEventSupplierValues(eventId: string, linkId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const valorPrevistoRaw = formData.get("valorPrevisto");
  const valorContratadoRaw = formData.get("valorContratado");
  await repository.eventSuppliers.update(session, linkId, {
    valorPrevisto: valorPrevistoRaw ? Number(valorPrevistoRaw) : undefined,
    valorContratado: valorContratadoRaw ? Number(valorContratadoRaw) : undefined,
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeEventSupplier(eventId: string, linkId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.eventSuppliers.remove(session, linkId);
  revalidatePath(`/eventos/${eventId}`);
}
