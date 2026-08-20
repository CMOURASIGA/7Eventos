import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { Card, CardHeader, Field, Input, Select, Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";

interface SearchParams {
  nome?: string;
  local?: string;
  status?: string;
  capacidade?: string;
  q?: string;
}

export default async function SearchSpacesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;
  const searched = params.q === "1";

  const results = searched
    ? await repository.spaces.list(session, {
        nome: params.nome || undefined,
        local: params.local || undefined,
        status: (params.status as "ativo" | "inativo") || undefined,
        capacidadeMinima: params.capacidade ? Number(params.capacidade) : undefined,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Buscar espaços</h1>
        <p className="text-sm text-fg-muted">Filtre por nome, local, status e capacidade mínima.</p>
      </div>

      <Card>
        <form className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <input type="hidden" name="q" value="1" />
          <Field label="Nome" htmlFor="nome">
            <Input id="nome" name="nome" defaultValue={params.nome} />
          </Field>
          <Field label="Local" htmlFor="local">
            <Input id="local" name="local" defaultValue={params.local} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={params.status ?? ""}>
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </Field>
          <Field label="Capacidade mínima" htmlFor="capacidade">
            <Input id="capacidade" name="capacidade" type="number" min={0} defaultValue={params.capacidade} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Buscar</Button>
          </div>
        </form>
      </Card>

      {!searched ? (
        <Card>
          <EmptyState
            title="Informe filtros e clique em buscar"
            description="Os resultados aparecem aqui após a primeira pesquisa."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Resultados" description={`${results.length} espaço(s) encontrado(s)`} />
          {results.length === 0 ? (
            <EmptyState title="Nenhum espaço encontrado para os filtros informados." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {results.map((space) => (
                <li key={space.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/espacos/${space.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                      {space.nome}
                    </Link>
                    <p className="text-xs text-fg-muted">
                      {space.local} · Capacidade {space.capacidade}
                    </p>
                  </div>
                  <Badge tone={space.status === "ativo" ? "success" : "neutral"}>
                    {space.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
