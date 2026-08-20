"use server";

import { revalidatePath } from "next/cache";
import { getDataMode } from "@/lib/data";
import { requireAuthSession } from "@/lib/auth/session";
import { assertCan } from "@/lib/domain/permissions";
import { resetStore } from "./store";

/** Restaura a base de demonstração ao estado inicial (apenas DATA_MODE=mock). */
export async function resetDemoData(): Promise<void> {
  if (getDataMode() !== "mock") return;
  const session = await requireAuthSession();
  assertCan(session.perfil, "manage_company_settings");
  resetStore();
  revalidatePath("/", "layout");
}
