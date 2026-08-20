"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function createReservation(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const spaceId = String(formData.get("spaceId") ?? "");
  const inicio = String(formData.get("inicio") ?? "");
  const fim = String(formData.get("fim") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  const quantidadeRaw = formData.get("quantidadePessoas");
  const quantidadePessoas = quantidadeRaw ? Number(quantidadeRaw) : undefined;
  const redirectTo = String(formData.get("redirectTo") ?? "/reservas/nova");
  const eventId = String(formData.get("eventId") ?? "") || null;

  if (!spaceId || !inicio || !fim || !motivo) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Preencha espaço, período e motivo da reserva.")}`);
  }

  try {
    const reservation = await repository.reservations.create(session, {
      spaceId,
      inicio: new Date(inicio).toISOString(),
      fim: new Date(fim).toISOString(),
      motivo,
      quantidadePessoas,
      solicitanteId: session.userId,
      eventId,
    });
    revalidatePath("/reservas");
    revalidatePath("/dashboard");
    if (eventId) {
      revalidatePath(`/eventos/${eventId}`);
      redirect(`/eventos/${eventId}?reservationCreated=1`);
    }
    redirect(`/reservas/buscar?created=${reservation.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`${redirectTo}?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function updateReservationStatus(id: string, status: "confirmada" | "cancelada" | "concluida") {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.reservations.updateStatus(session, id, status);
  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  revalidatePath("/dashboard");
}

export async function linkReservationToEvent(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) {
    redirect(`/reservas/${id}?error=${encodeURIComponent("Selecione um evento para vincular.")}`);
  }
  try {
    await repository.reservations.linkToEvent(session, id, eventId);
    revalidatePath(`/reservas/${id}`);
    revalidatePath(`/eventos/${eventId}`);
    redirect(`/reservas/${id}?linked=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/reservas/${id}?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
