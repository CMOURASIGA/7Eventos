"use server";

import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { TeamMemberStatus } from "@/lib/domain/types";

export async function addTeamMember(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const userId = String(formData.get("userId") ?? "");
  const funcao = String(formData.get("funcao") ?? "").trim();
  if (!userId || !funcao) return;

  await repository.team.create(session, {
    eventId,
    userId,
    funcao,
    responsabilidade: String(formData.get("responsabilidade") ?? "") || undefined,
    escala: String(formData.get("escala") ?? "") || undefined,
    status: "convidado",
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateTeamMemberStatus(eventId: string, memberId: string, status: TeamMemberStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.team.update(session, memberId, { status });
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeTeamMember(eventId: string, memberId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.team.remove(session, memberId);
  revalidatePath(`/eventos/${eventId}`);
}
