"use server";

import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function saveBudget(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
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
