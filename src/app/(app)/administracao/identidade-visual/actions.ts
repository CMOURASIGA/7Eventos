"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isValidBrandColor, isValidLogoUrl } from "@/lib/branding";

export async function updateBranding(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const corPrimaria = String(formData.get("corPrimaria") ?? "").trim();
  const corSecundaria = String(formData.get("corSecundaria") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  if (!isValidBrandColor(corPrimaria) || !isValidBrandColor(corSecundaria)) {
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent("Use cores no formato hexadecimal, por exemplo #003b73.")}`);
  }
  if (!isValidLogoUrl(logoUrl)) {
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent("Informe uma URL HTTPS válida para a logo ou um caminho interno iniciado por /.")}`);
  }

  try {
    await getRepository().companies.updateBranding(session, {
      corPrimaria,
      corSecundaria,
      logoUrl: logoUrl || undefined,
    });
    revalidatePath("/", "layout");
    redirect("/administracao/identidade-visual?updated=1");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Não foi possível atualizar a identidade visual.";
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent(message)}`);
  }
}

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
