"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";

export async function saveBudget(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  // A camada de dados também valida (defesa em profundidade), mas checar
  // aqui evita uma exceção crua se a action for chamada fora do formulário
  // (que já só renderiza para quem tem manage_budget).
  if (!can(session.perfil, "manage_budget")) {
    redirect(`/eventos/${eventId}?negado=1`);
  }
  const repository = getRepository();
  const valorPrevisto = Number(formData.get("valorPrevisto") ?? 0);

  await repository.budget.upsert(session, eventId, {
    valorPrevisto: Number.isFinite(valorPrevisto) ? valorPrevisto : 0,
    observacoes: String(formData.get("observacoes") ?? "") || undefined,
    status: (String(formData.get("status") ?? "previsto") as "previsto" | "em_analise" | "aprovado"),
  });
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
}
