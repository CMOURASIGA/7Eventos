import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { CATEGORIAS_FORNECEDOR } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Badge, EmptyState, Banner } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ICONS } from "@/components/layout/icons";

interface SearchParams {
  nome?: string;
  categoria?: string;
  status?: string;
  negado?: string;
}

export default async function FornecedoresHubPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;
  const canManage = can(session.perfil, "manage_suppliers");

  const suppliers = await repository.suppliers.list(session, {
    nome: params.nome || undefined,
    categoria: params.categoria || undefined,
    status: (params.status as "ativo" | "inativo") || undefined,
  });

  return (
    <div className="space-y-6">
      {params.negado === "1" && (
        <Banner tone="warning">Você não tem permissão para acessar essa funcionalidade.</Banner>
      )}
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Fornecedores</h1>
          <p className="text-sm text-fg-muted">Catálogo de fornecedores da empresa, vinculável a eventos.</p>
        </div>
        {canManage && (
          <ButtonLink href="/fornecedores/novo" size="sm">
            <ICONS.plus /> Novo fornecedor
          </ButtonLink>
        )}
      </div>

      <Card>
        <form className="p-5 grid sm:grid-cols-3 gap-4 items-end">
          <Field label="Nome" htmlFor="nome">
            <Input id="nome" name="nome" defaultValue={params.nome} placeholder="Buscar por nome..." />
          </Field>
          <Field label="Categoria" htmlFor="categoria">
            <Select id="categoria" name="categoria" defaultValue={params.categoria ?? ""}>
              <option value="">Todas</option>
              {CATEGORIAS_FORNECEDOR.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={params.status ?? ""}>
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit">Filtrar</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Fornecedores" description={`${suppliers.length} cadastrado(s)`} />
        {suppliers.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Ajuste os filtros ou cadastre o primeiro fornecedor."
            action={canManage && <ButtonLink href="/fornecedores/novo">Novo fornecedor</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {suppliers.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/fornecedores/${s.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                    {s.nome}
                  </Link>
                  <p className="text-xs text-fg-muted">
                    {s.categoria}
                    {s.servicos && ` · ${s.servicos}`}
                  </p>
                </div>
                <Badge tone={s.status === "ativo" ? "success" : "neutral"}>{s.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
