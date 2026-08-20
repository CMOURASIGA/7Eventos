"use server";

import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { EFFORT_FACTOR_KEYS, IMPACT_FACTOR_KEYS } from "@/lib/domain/complexity";
import type { ComplexityFactors } from "@/lib/domain/types";

export async function assessComplexity(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const factors = {} as ComplexityFactors;
  for (const key of [...EFFORT_FACTOR_KEYS, ...IMPACT_FACTOR_KEYS]) {
    const raw = Number(formData.get(key) ?? 0);
    factors[key] = Number.isFinite(raw) ? Math.min(3, Math.max(0, raw)) : 0;
  }

  await repository.complexity.assess(session, eventId, factors);
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
}
