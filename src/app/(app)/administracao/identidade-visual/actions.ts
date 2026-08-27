"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getDataMode, getRepository } from "@/lib/data";
import { getSupabaseServiceClient } from "@/lib/data/supabase/client";
import { isValidBrandColor, isValidLogoUrl } from "@/lib/branding";
import { setDemoBrandingOverride } from "@/lib/branding-server";

export async function updateBranding(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const nomeExibido = String(formData.get("nomeExibido") ?? "").trim();
  const corPrimaria = String(formData.get("corPrimaria") ?? "").trim();
  const corSecundaria = String(formData.get("corSecundaria") ?? "").trim();
  let logoUrl = String(formData.get("logoUrl") ?? "").trim();

  if (!nomeExibido || nomeExibido.length > 80) {
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent("Informe um nome exibido com até 80 caracteres.")}`);
  }

  if (!isValidBrandColor(corPrimaria) || !isValidBrandColor(corSecundaria)) {
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent("Use cores no formato hexadecimal, por exemplo #003b73.")}`);
  }
  if (!isValidLogoUrl(logoUrl) && !isSupportedLogoDataUrl(logoUrl)) {
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent("Informe uma URL HTTPS válida para a logo ou um caminho interno iniciado por /.")}`);
  }

  try {
    if (isSupportedLogoDataUrl(logoUrl)) {
      logoUrl = await persistUploadedLogo(session.companyId, logoUrl);
    }
    const company = await getRepository().companies.updateBranding(session, {
      nomeExibido,
      corPrimaria,
      corSecundaria,
      logoUrl: logoUrl || undefined,
    });
    await setDemoBrandingOverride(company);
    revalidatePath("/", "layout");
    redirect("/administracao/identidade-visual?updated=1");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Não foi possível atualizar a identidade visual.";
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent(message)}`);
  }
}

export async function restoreBranding(): Promise<void> {
  const session = await requireAuthSession();
  try {
    const company = await getRepository().companies.updateBranding(session, {
      nomeExibido: "Consult Services Tecnologia",
      corPrimaria: "#003b73",
      corSecundaria: "#00aeef",
      logoUrl: "/consult-services-logo-retangular.png",
    });
    await setDemoBrandingOverride(company);
    revalidatePath("/", "layout");
    redirect("/administracao/identidade-visual?restored=1");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Não foi possível restaurar a identidade visual.";
    redirect(`/administracao/identidade-visual?error=${encodeURIComponent(message)}`);
  }
}

function isSupportedLogoDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value) && value.length <= 3_500;
}

async function persistUploadedLogo(companyId: string | null, dataUrl: string): Promise<string> {
  if (!companyId) throw new Error("Empresa não identificada.");
  if (getDataMode() === "mock") return dataUrl;

  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) throw new Error("Formato de logo não suportado.");
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  const path = `companies/${companyId}/branding/logo.${extension}`;
  const db = getSupabaseServiceClient();
  const { error } = await db.storage.from("brand-assets").upload(path, Buffer.from(match[2], "base64"), {
    contentType: match[1],
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(`Não foi possível salvar a logo no Storage: ${error.message}`);
  return db.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
}

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
