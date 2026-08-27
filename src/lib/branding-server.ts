import "server-only";

import { cookies } from "next/headers";
import type { Company } from "./domain/types";
import { getDataMode } from "./data";

const COOKIE_NAME = "7eventos-demo-branding";

type BrandingOverride = {
  companyId: string;
  configuracoes: Pick<Company["configuracoes"], "nomeExibido" | "corPrimaria" | "corSecundaria" | "logoUrl">;
};

/**
 * O mock em Vercel pode alternar de instância entre duas requisições.
 * Mantemos apenas a preferência visual da sessão no cookie para que a
 * demonstração sobreviva a redirects e reloads. Dados oficiais continuam
 * persistidos exclusivamente no Supabase.
 */
export async function withDemoBrandingOverride(company: Company | null): Promise<Company | null> {
  if (!company || getDataMode() !== "mock") return company;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return company;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as BrandingOverride;
    if (parsed.companyId !== company.id) return company;
    return { ...company, configuracoes: { ...company.configuracoes, ...parsed.configuracoes } };
  } catch {
    return company;
  }
}

export async function setDemoBrandingOverride(company: Company): Promise<void> {
  if (getDataMode() !== "mock") return;
  const payload: BrandingOverride = {
    companyId: company.id,
    configuracoes: {
      nomeExibido: company.configuracoes.nomeExibido,
      corPrimaria: company.configuracoes.corPrimaria,
      corSecundaria: company.configuracoes.corSecundaria,
      logoUrl: company.configuracoes.logoUrl,
    },
  };
  (await cookies()).set(COOKIE_NAME, encodeURIComponent(JSON.stringify(payload)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}
