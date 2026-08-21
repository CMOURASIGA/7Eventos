import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { CATEGORIAS_FORNECEDOR } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Textarea, Badge, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { updateSupplier, setSupplierStatus } from "../actions";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;
  const { error, updated } = await searchParams;

  const supplier = await repository.suppliers.get(session, id);
  if (!supplier) notFound();

  const canManage = can(session.perfil, "manage_suppliers");
  const updateAction = updateSupplier.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        breadcrumb={[{ label: "Fornecedores", href: "/fornecedores" }, { label: supplier.nome }]}
        backHref="/fornecedores"
        title={
          <span className="flex items-center gap-2 flex-wrap">
            {supplier.nome}
            <Badge tone={supplier.status === "ativo" ? "success" : "neutral"}>
              {supplier.status === "ativo" ? "Ativo" : "Inativo"}
            </Badge>
          </span>
        }
        description={supplier.categoria}
        actions={
          canManage && (
            <ConfirmButton
              variant={supplier.status === "ativo" ? "danger" : "secondary"}
              size="sm"
              title={supplier.status === "ativo" ? "Inativar fornecedor" : "Reativar fornecedor"}
              description={
                supplier.status === "ativo"
                  ? `O fornecedor "${supplier.nome}" não poderá mais ser vinculado a novos eventos. O histórico é preservado e a inativação pode ser desfeita depois.`
                  : `O fornecedor "${supplier.nome}" volta a poder ser vinculado a eventos.`
              }
              confirmLabel={supplier.status === "ativo" ? "Inativar" : "Reativar"}
              aria-label={`${supplier.status === "ativo" ? "Inativar" : "Reativar"} fornecedor ${supplier.nome}`}
              onConfirm={setSupplierStatus.bind(null, id, supplier.status === "ativo" ? "inativo" : "ativo")}
            >
              {supplier.status === "ativo" ? "Inativar fornecedor" : "Reativar fornecedor"}
            </ConfirmButton>
          )
        }
      />

      {error && <Banner tone="danger">{error}</Banner>}
      {updated === "1" && <Banner tone="success">Fornecedor atualizado com sucesso.</Banner>}

      <Card>
        <CardHeader title="Dados do fornecedor" />
        <form action={updateAction} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome / Razão social" htmlFor="nome" required>
              <Input id="nome" name="nome" defaultValue={supplier.nome} required disabled={!canManage} />
            </Field>
            <Field label="Categoria" htmlFor="categoria" required>
              <Select id="categoria" name="categoria" defaultValue={supplier.categoria} required disabled={!canManage}>
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
              <Input id="documento" name="documento" defaultValue={supplier.documento} disabled={!canManage} />
            </Field>
            <Field label="Contato" htmlFor="contato">
              <Input id="contato" name="contato" defaultValue={supplier.contato} disabled={!canManage} />
            </Field>
          </div>
          <Field label="Serviços oferecidos" htmlFor="servicos">
            <Input id="servicos" name="servicos" defaultValue={supplier.servicos} disabled={!canManage} />
          </Field>
          <Field label="Observações" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" defaultValue={supplier.observacoes} disabled={!canManage} />
          </Field>

          {canManage && (
            <div className="flex justify-end pt-2">
              <Button type="submit">Salvar alterações</Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
