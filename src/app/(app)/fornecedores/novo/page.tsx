import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { can } from "@/lib/domain/permissions";
import { CATEGORIAS_FORNECEDOR } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Textarea, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { createSupplier } from "../actions";

export default async function NewSupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_suppliers")) redirect("/fornecedores?negado=1");
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        breadcrumb={[{ label: "Fornecedores", href: "/fornecedores" }, { label: "Novo fornecedor" }]}
        backHref="/fornecedores"
        title="Novo fornecedor"
        description="Cadastre um fornecedor no catálogo da empresa. Depois ele pode ser vinculado a qualquer evento."
      />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Dados do fornecedor" />
        <form action={createSupplier} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome / Razão social" htmlFor="nome" required>
              <Input id="nome" name="nome" required maxLength={160} />
            </Field>
            <Field label="Categoria" htmlFor="categoria" required>
              <Select id="categoria" name="categoria" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {CATEGORIAS_FORNECEDOR.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Documento (CNPJ/CPF)" htmlFor="documento">
              <Input id="documento" name="documento" maxLength={40} />
            </Field>
            <Field label="Contato" htmlFor="contato" hint="E-mail ou telefone">
              <Input id="contato" name="contato" maxLength={160} />
            </Field>
          </div>
          <Field label="Serviços oferecidos" htmlFor="servicos">
            <Input id="servicos" name="servicos" maxLength={300} placeholder="Ex: Som, iluminação e projeção" />
          </Field>
          <Field label="Observações" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" maxLength={500} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Salvar fornecedor</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
