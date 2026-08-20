import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { COMPLEXITY_LEVEL_LABELS } from "@/lib/domain/complexity";
import { Card, CardHeader, Field, Input, Select, Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

interface SearchParams {
  texto?: string;
  demandante?: string;
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
  complexidade?: string;
  spaceId?: string;
  tematica?: string;
  estrategico?: string;
  q?: string;
}

export default async function SearchEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;
  const searched = params.q === "1" || params.estrategico != null;

  const spaces = await repository.spaces.list(session);

  const results = searched
    ? await repository.events.search(session, {
        texto: params.texto || undefined,
        demandante: params.demandante || undefined,
        dataInicial: params.dataInicial ? new Date(params.dataInicial).toISOString() : undefined,
        dataFinal: params.dataFinal ? new Date(params.dataFinal).toISOString() : undefined,
        status: (params.status as never) || undefined,
        complexidade: params.complexidade || undefined,
        spaceId: params.spaceId || undefined,
        tematica: params.tematica || undefined,
        estrategico: params.estrategico ? params.estrategico === "true" : undefined,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Buscar eventos</h1>
        <p className="text-sm text-fg-muted">Filtre por palavra-chave, demandante, período, status, complexidade, local, temática ou eventos estratégicos.</p>
      </div>

      <Card>
        <form className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <input type="hidden" name="q" value="1" />
          <Field label="Palavra-chave / título" htmlFor="texto">
            <Input id="texto" name="texto" defaultValue={params.texto} />
          </Field>
          <Field label="Demandante" htmlFor="demandante">
            <Input id="demandante" name="demandante" defaultValue={params.demandante} />
          </Field>
          <Field label="Data inicial" htmlFor="dataInicial">
            <Input id="dataInicial" name="dataInicial" type="date" defaultValue={params.dataInicial} />
          </Field>
          <Field label="Data final" htmlFor="dataFinal">
            <Input id="dataFinal" name="dataFinal" type="date" defaultValue={params.dataFinal} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={params.status ?? ""}>
              <option value="">Todos</option>
              {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Complexidade" htmlFor="complexidade">
            <Select id="complexidade" name="complexidade" defaultValue={params.complexidade ?? ""}>
              <option value="">Todas</option>
              {Object.entries(COMPLEXITY_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Local (espaço)" htmlFor="spaceId">
            <Select id="spaceId" name="spaceId" defaultValue={params.spaceId ?? ""}>
              <option value="">Todos</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estratégico" htmlFor="estrategico">
            <Select id="estrategico" name="estrategico" defaultValue={params.estrategico ?? ""}>
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Buscar</Button>
          </div>
        </form>
      </Card>

      {!searched ? (
        <Card>
          <EmptyState title="Informe filtros e clique em buscar" description="Os resultados aparecem aqui após a primeira pesquisa." />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Resultados" description={`${results.length} evento(s) encontrado(s)`} />
          {results.length === 0 ? (
            <EmptyState title="Nenhum evento encontrado para os filtros informados." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {results.map((event) => (
                <li key={event.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`/eventos/${event.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                      {event.titulo}
                    </Link>
                    <p className="text-xs text-fg-muted">
                      {event.demandante} · {event.categoria} · atualizado em {formatDate(event.updatedAt)}
                    </p>
                  </div>
                  <Badge tone="brand">{EVENT_STATUS_LABELS[event.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
