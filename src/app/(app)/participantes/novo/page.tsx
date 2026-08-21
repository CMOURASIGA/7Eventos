import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { can } from "@/lib/domain/permissions";
import { CATEGORIAS_PARTICIPANTE } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Textarea, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { createParticipant } from "../actions";

export default async function NewParticipantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_participants")) redirect("/participantes?negado=1");
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        breadcrumb={[{ label: "Participantes", href: "/participantes" }, { label: "Novo participante" }]}
        backHref="/participantes"
        title="Novo participante"
        description="Cadastre um participante no catálogo da empresa. Depois ele pode ser inscrito em qualquer evento."
      />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Dados do participante" />
        <form action={createParticipant} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome" htmlFor="nome" required>
              <Input id="nome" name="nome" required maxLength={160} />
            </Field>
            <Field label="E-mail" htmlFor="email" required>
              <Input id="email" name="email" type="email" required maxLength={160} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Telefone" htmlFor="telefone" hint="Opcional — só quando necessário">
              <Input id="telefone" name="telefone" maxLength={30} />
            </Field>
            <Field label="Categoria" htmlFor="categoria">
              <Select id="categoria" name="categoria" defaultValue="">
                <option value="">Nenhuma</option>
                {CATEGORIAS_PARTICIPANTE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Organização" htmlFor="organizacao">
            <Input id="organizacao" name="organizacao" maxLength={160} />
          </Field>
          <Field label="Observações" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" maxLength={500} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Salvar participante</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
