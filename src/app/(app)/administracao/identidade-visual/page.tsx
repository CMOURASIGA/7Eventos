import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Card, CardHeader, Field, Input, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { updateBranding } from "./actions";
import { BrandColorField } from "./BrandColorField";
import { withDemoBrandingOverride } from "@/lib/branding-server";

export default async function BrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_company_settings") || !session.companyId) redirect("/dashboard?negado=1");

  const company = await withDemoBrandingOverride(await getRepository().companies.get(session, session.companyId));
  if (!company) redirect("/dashboard?negado=1");
  const { error, updated } = await searchParams;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="page-hero">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Identidade visual</h1>
        <p className="text-sm text-fg-muted">Personalize a marca da empresa sem alterar a identidade do produto 7Eventos.</p>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}
      {updated === "1" && <Banner tone="success">Identidade visual atualizada em todo o sistema.</Banner>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Marca da empresa" description="As alterações são aplicadas ao menu, botões, destaques e cabeçalho." />
          <form action={updateBranding} className="p-5 grid gap-5 sm:grid-cols-2">
            <BrandColorField name="corPrimaria" label="Cor principal" hint="Usada no menu lateral e nas ações principais." defaultValue={company.configuracoes.corPrimaria ?? "#003b73"} />
            <BrandColorField name="corSecundaria" label="Cor de destaque" hint="Usada em seleção, foco e indicadores da marca." defaultValue={company.configuracoes.corSecundaria ?? "#00aeef"} />
            <div className="sm:col-span-2">
              <Field label="URL da logo" htmlFor="logoUrl" hint="Aceita URL HTTPS ou caminho interno. Para produção, use o Storage configurado para o projeto.">
                <Input id="logoUrl" name="logoUrl" type="text" defaultValue={company.configuracoes.logoUrl ?? ""} placeholder="https://.../logo.png" />
              </Field>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit">Salvar identidade visual</Button>
              <span className="text-xs text-fg-muted">Disponível somente para o Administrador da empresa.</span>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Prévia atual" description={company.nomeFantasia} />
          <div className="p-5">
            <div className="rounded-[var(--radius-md)] border overflow-hidden bg-white shadow-sm">
              <div className="h-16 px-4 flex items-center gap-3 border-b" style={{ backgroundColor: company.configuracoes.corPrimaria ?? "#003b73" }}>
                <div className="h-11 w-11 rounded-lg bg-white p-1.5 flex items-center justify-center">
                  <BrandLogo company={company} />
                </div>
                <div className="text-white">
                  <p className="text-sm font-semibold">7Eventos</p>
                  <p className="text-xs opacity-80">{company.nomeFantasia}</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="h-3 rounded-full bg-surface-muted w-3/4" />
                <div className="h-3 rounded-full bg-surface-muted w-1/2" />
                <div className="inline-flex rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: company.configuracoes.corPrimaria ?? "#003b73" }}>
                  Ação principal
                </div>
                <div className="h-2 rounded-full w-full" style={{ backgroundColor: company.configuracoes.corSecundaria ?? "#00aeef" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
