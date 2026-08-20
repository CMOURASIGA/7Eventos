import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { COMPLEXITY_LEVEL_LABELS } from "@/lib/domain/complexity";
import { Card, CardHeader, Field, Input, Select, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";

interface SearchParams {
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
  categoria?: string;
  complexidade?: string;
  spaceId?: string;
  demandante?: string;
  estrategico?: string;
  orcamento?: string;
  q?: string;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;
  const searched = params.q === "1";

  const spaces = await repository.spaces.list(session);

  const results = searched
    ? await repository.events.search(session, {
        dataInicial: params.dataInicial ? new Date(params.dataInicial).toISOString() : undefined,
        dataFinal: params.dataFinal ? new Date(params.dataFinal).toISOString() : undefined,
        status: (params.status as never) || undefined,
        complexidade: params.complexidade || undefined,
        spaceId: params.spaceId || undefined,
        demandante: params.demandante || undefined,
        estrategico: params.estrategico ? params.estrategico === "true" : undefined,
      })
    : [];

  const filtered = searched
    ? results.filter((e) => !params.categoria || e.categoria === params.categoria)
    : [];

  const budgets = await Promise.all(filtered.map((e) => repository.budget.getByEvent(session, e.id)));
  const totalPrevisto = budgets.reduce((sum, b) => sum + (b?.valorPrevisto ?? 0), 0);

  const exportHref = searched
    ? `/api/relatorios/eventos?${new URLSearchParams(params as Record<string, string>).toString()}`
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Relatórios</h1>
        <p className="text-sm text-fg-muted">Consultas gerenciais por período, status, categoria, complexidade, espaço, demandante, estratégico e orçamento.</p>
      </div>

      <Card>
        <form className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <input type="hidden" name="q" value="1" />
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
          <Field label="Espaço" htmlFor="spaceId">
            <Select id="spaceId" name="spaceId" defaultValue={params.spaceId ?? ""}>
              <option value="">Todos</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Demandante" htmlFor="demandante">
            <Input id="demandante" name="demandante" defaultValue={params.demandante} />
          </Field>
          <Field label="Estratégico" htmlFor="estrategico">
            <Select id="estrategico" name="estrategico" defaultValue={params.estrategico ?? ""}>
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Gerar relatório</Button>
          </div>
        </form>
      </Card>

      {!searched ? (
        <Card>
          <EmptyState title="Informe os filtros e clique em gerar relatório." />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Resultado"
            description={`${filtered.length} evento(s) · orçamento previsto total ${formatCurrency(totalPrevisto)}`}
            actions={
              exportHref && (
                <a href={exportHref} className="text-sm text-brand-700 font-medium hover:underline">
                  Exportar CSV
                </a>
              )
            }
          />
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum evento encontrado para os filtros informados." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-muted uppercase border-b border-border-subtle">
                    <th className="px-5 py-2">Evento</th>
                    <th className="px-5 py-2">Demandante</th>
                    <th className="px-5 py-2">Categoria</th>
                    <th className="px-5 py-2">Status</th>
                    <th className="px-5 py-2">Atualizado</th>
                    <th className="px-5 py-2">Orçamento previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event, idx) => (
                    <tr key={event.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-2 font-medium">
                        <Link href={`/eventos/${event.id}`} className="text-[var(--foreground)] hover:text-brand-700 hover:underline">
                          {event.titulo}
                        </Link>
                      </td>
                      <td className="px-5 py-2 text-fg-muted">{event.demandante}</td>
                      <td className="px-5 py-2 text-fg-muted">{event.categoria}</td>
                      <td className="px-5 py-2 text-fg-muted">{EVENT_STATUS_LABELS[event.status]}</td>
                      <td className="px-5 py-2 text-fg-muted">{formatDate(event.updatedAt)}</td>
                      <td className="px-5 py-2 text-fg-muted">
                        {budgets[idx] ? formatCurrency(budgets[idx]!.valorPrevisto) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
