"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { RegistrationStatus } from "@/lib/domain/types";

export async function addRegistration(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) return;

  try {
    await repository.registrations.create(session, {
      eventId,
      participantId,
      lote: String(formData.get("lote") ?? "") || undefined,
      categoria: String(formData.get("categoria") ?? "") || undefined,
    });
    revalidatePath(`/eventos/${eventId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/eventos/${eventId}?tab=participantes&error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function updateRegistrationStatus(eventId: string, registrationId: string, status: RegistrationStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.registrations.updateStatus(session, registrationId, status);
  revalidatePath(`/eventos/${eventId}`);
}

export async function checkInRegistration(eventId: string, registrationId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  try {
    await repository.registrations.checkIn(session, registrationId);
    revalidatePath(`/eventos/${eventId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/eventos/${eventId}?tab=participantes&error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function undoCheckInRegistration(eventId: string, registrationId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.registrations.undoCheckIn(session, registrationId);
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeRegistration(eventId: string, registrationId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.registrations.remove(session, registrationId);
  revalidatePath(`/eventos/${eventId}`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
