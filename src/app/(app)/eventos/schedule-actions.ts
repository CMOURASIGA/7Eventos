"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { ScheduleItemPriority, ScheduleItemStatus } from "@/lib/domain/types";

export async function addScheduleItem(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const inicio = String(formData.get("inicio") ?? "");
  const fim = String(formData.get("fim") ?? "");
  if (!titulo || !inicio || !fim) {
    redirect(`/eventos/${eventId}?tab=cronograma&error=${encodeURIComponent("Informe título, início e fim da atividade.")}`);
  }
  if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
    redirect(`/eventos/${eventId}?tab=cronograma&error=${encodeURIComponent("O fim da atividade deve ser posterior ao início.")}`);
  }

  await repository.schedule.create(session, {
    eventId,
    titulo,
    descricao: String(formData.get("descricao") ?? "") || undefined,
    inicio,
    fim,
    responsavelId: String(formData.get("responsavelId") ?? "") || undefined,
    dependeDeId: String(formData.get("dependeDeId") ?? "") || undefined,
    prioridade: (String(formData.get("prioridade") ?? "media") as ScheduleItemPriority),
    status: "pendente",
    observacao: String(formData.get("observacao") ?? "") || undefined,
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateScheduleItemStatus(eventId: string, itemId: string, status: ScheduleItemStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.schedule.update(session, itemId, { status });
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeScheduleItem(eventId: string, itemId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.schedule.remove(session, itemId);
  revalidatePath(`/eventos/${eventId}`);
}
