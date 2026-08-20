import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { can } from "@/lib/domain/permissions";
import { CATEGORIAS, TEMATICAS } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Textarea, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { WizardSteps } from "../WizardSteps";
import { wizardCreate } from "../wizard-actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "create_edit_event")) redirect("/eventos?negado=1");
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Eventos", href: "/eventos" }, { label: "Novo evento" }]}
        backHref="/eventos"
        title="Novo evento"
        description="Preencha em etapas. Seus dados ficam salvos a cada passo — você pode sair a qualquer momento e retomar depois pelo detalhe do evento."
      />

      <WizardSteps current={1} />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Informações básicas" />
        <form action={wizardCreate} className="p-5 space-y-4">
          <Field label="Título" htmlFor="titulo" required>
            <Input id="titulo" name="titulo" required maxLength={160} placeholder="Ex: Convenção Anual de Parceiros" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Categoria" htmlFor="categoria" required>
              <Select id="categoria" name="categoria" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Temática" htmlFor="tematica">
              <Select id="tematica" name="tematica" defaultValue="">
                <option value="">Selecione</option>
                {TEMATICAS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descrição" htmlFor="descricao">
            <Textarea id="descricao" name="descricao" maxLength={1000} placeholder="Opcional: contexto geral do evento" />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
