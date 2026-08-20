import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { COMPLEXITY_LEVEL_LABELS } from "@/lib/domain/complexity";
import { RESERVATION_STATUS_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, KPICard, Badge, EmptyState } from "@/components/ui/primitives";
import { ICONS } from "@/components/layout/icons";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString();
  const period = { from: params.from ?? defaultFrom, to: params.to ?? defaultTo };

  const periodLengthMs = new Date(period.to).getTime() - new Date(period.from).getTime();
  const previousPeriod = {
    from: new Date(new Date(period.from).getTime() - periodLengthMs).toISOString(),
    to: new Date(new Date(period.from).getTime() - 1).toISOString(),
  };

  const [data, previousData] = await Promise.all([
    repository.dashboard.get(session, period),
    repository.dashboard.get(session, previousPeriod),
  ]);

  const eventsChangePct =
    previousData.totalEventos > 0
      ? Math.round(((data.totalEventos - previousData.totalEventos) / previousData.totalEventos) * 100)
      : null;

  const concludedPct =
    data.totalEventos > 0 ? Math.round(((data.eventosPorStatus["concluido"] ?? 0) / data.totalEventos) * 100) : null;

  const avgOccupancy =
    data.ocupacaoEspacos.length > 0
      ? Math.round(data.ocupacaoEspacos.reduce((sum, s) => sum + s.percentual, 0) / data.ocupacaoEspacos.length)
      : null;

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Dashboard</h1>
          <p className="text-sm text-fg-muted">Visão gerencial dos eventos da sua empresa.</p>
        </div>
        <form className="flex items-end gap-2 text-sm flex-wrap" action="/dashboard">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-muted">De</span>
            <input
              type="date"
              name="from"
              defaultValue={period.from.slice(0, 10)}
              className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-muted">Até</span>
            <input
              type="date"
              name="to"
              defaultValue={period.to.slice(0, 10)}
              className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-[var(--radius-sm)] bg-brand-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-brand-700"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          label="Total de eventos"
          value={data.totalEventos}
          href="/eventos/buscar"
          hint={eventsChangePct == null ? undefined : `${eventsChangePct >= 0 ? "+" : ""}${eventsChangePct}% vs período anterior`}
          tone={eventsChangePct == null ? "neutral" : eventsChangePct >= 0 ? "success" : "warning"}
          icon={<ICONS.events />}
        />
        <KPICard
          label="Eventos estratégicos"
          value={data.eventosEstrategicos}
          tone="brand"
          href="/eventos/buscar?estrategico=true"
          icon={<ICONS.star />}
        />
        <KPICard
          label="Com orçamento previsto"
          value={data.eventosComOrcamento}
          tone="success"
          icon={<ICONS.wallet />}
        />
        <KPICard label="Sem orçamento previsto" value={data.eventosSemOrcamento} tone="warning" icon={<ICONS.wallet />} />
        <KPICard
          label="Próximos eventos"
          value={data.proximosEventos.length}
          href="/agenda"
          tone="info"
          icon={<ICONS.clock />}
        />
        {concludedPct != null && (
          <KPICard label="Concluídos no período" value={`${concludedPct}%`} tone="success" icon={<ICONS.check />} />
        )}
        {avgOccupancy != null && (
          <KPICard label="Ocupação média dos espaços" value={`${avgOccupancy}%`} tone="info" icon={<ICONS.spaces />} />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Eventos por status" />
          <div className="p-5 space-y-2">
            {Object.entries(data.eventosPorStatus).length === 0 && (
              <EmptyState title="Nenhum evento no período selecionado." />
            )}
            {Object.entries(data.eventosPorStatus).map(([status, count]) => (
              <BarRow
                key={status}
                label={EVENT_STATUS_LABELS[status as keyof typeof EVENT_STATUS_LABELS] ?? status}
                value={count}
                max={data.totalEventos}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Eventos por complexidade" />
          <div className="p-5 space-y-2">
            {Object.entries(data.eventosPorComplexidade).length === 0 && (
              <EmptyState title="Nenhuma avaliação de complexidade no período." />
            )}
            {Object.entries(data.eventosPorComplexidade).map(([nivel, count]) => (
              <BarRow
                key={nivel}
                label={COMPLEXITY_LEVEL_LABELS[nivel as keyof typeof COMPLEXITY_LEVEL_LABELS] ?? nivel}
                value={count}
                max={data.totalEventos}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Eventos por categoria" />
          <div className="p-5 space-y-2">
            {Object.entries(data.eventosPorCategoria).map(([categoria, count]) => (
              <BarRow key={categoria} label={categoria} value={count} max={data.totalEventos} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Reservas por status" />
          <div className="p-5 space-y-2">
            {Object.entries(data.reservasPorStatus).length === 0 && (
              <EmptyState title="Nenhuma reserva registrada." />
            )}
            {Object.entries(data.reservasPorStatus).map(([status, count]) => (
              <BarRow
                key={status}
                label={RESERVATION_STATUS_LABELS[status as keyof typeof RESERVATION_STATUS_LABELS] ?? status}
                value={count}
                max={Object.values(data.reservasPorStatus).reduce((a, b) => a + b, 0)}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Próximos eventos"
          actions={
            <Link href="/agenda" className="text-sm text-brand-700 font-medium hover:underline">
              Ver agenda
            </Link>
          }
        />
        {data.proximosEventos.length === 0 ? (
          <EmptyState title="Nenhum evento futuro agendado." />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {data.proximosEventos.map((event) => (
              <li key={event.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/eventos/${event.id}`}
                    className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700 truncate block"
                  >
                    {event.titulo}
                  </Link>
                  <p className="text-xs text-fg-muted">{event.demandante}</p>
                </div>
                <Badge tone="brand">{EVENT_STATUS_LABELS[event.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.ocupacaoEspacos.length > 0 && (
        <Card>
          <CardHeader title="Ocupação de espaços" description="Próximos 30 dias" />
          <div className="p-5 space-y-2">
            {data.ocupacaoEspacos.map((s) => (
              <BarRow key={s.spaceId} label={s.nome} value={s.percentual} max={100} suffix="%" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function BarRow({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-[var(--foreground)]">{label}</span>
        <span className="text-fg-muted">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
