"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { EventRiskSeverity, EventRiskStatus } from "@/lib/domain/types";

export async function addRisk(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) {
    redirect(`/eventos/${eventId}?tab=operacao&error=${encodeURIComponent("Informe o título do risco.")}`);
  }

  await repository.risks.create(session, {
    eventId,
    titulo,
    descricao: String(formData.get("descricao") ?? "") || undefined,
    severidade: (String(formData.get("severidade") ?? "media") as EventRiskSeverity),
    status: "aberto",
    responsavelId: String(formData.get("responsavelId") ?? "") || undefined,
    planoMitigacao: String(formData.get("planoMitigacao") ?? "") || undefined,
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateRiskStatus(eventId: string, riskId: string, status: EventRiskStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.risks.update(session, riskId, { status });
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeRisk(eventId: string, riskId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.risks.remove(session, riskId);
  revalidatePath(`/eventos/${eventId}`);
}
