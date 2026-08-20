"use server";

import { revalidatePath } from "next/cache";
import { getDataMode } from "@/lib/data";
import { resetStore } from "./store";

/** Restaura a base de demonstração ao estado inicial (apenas DATA_MODE=mock). */
export async function resetDemoData(): Promise<void> {
  if (getDataMode() !== "mock") return;
  resetStore();
  revalidatePath("/", "layout");
}
