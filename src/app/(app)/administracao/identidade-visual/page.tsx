import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Banner } from "@/components/ui/primitives";
import { withDemoBrandingOverride } from "@/lib/branding-server";
import { BrandEditor } from "./BrandEditor";

export default async function BrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string; restored?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_company_settings") || !session.companyId) redirect("/dashboard?negado=1");

  const company = await withDemoBrandingOverride(await getRepository().companies.get(session, session.companyId));
  if (!company) redirect("/dashboard?negado=1");
  const { error, updated, restored } = await searchParams;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="page-hero">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Identidade visual</h1>
        <p className="text-sm text-fg-muted">Personalize a marca da empresa sem alterar a identidade do produto 7Eventos.</p>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}
      {updated === "1" && <Banner tone="success">Identidade visual atualizada em todo o sistema.</Banner>}
      {restored === "1" && <Banner tone="success">Identidade padrão da Consult Services restaurada.</Banner>}

      <BrandEditor company={company} />
    </div>
  );
}
