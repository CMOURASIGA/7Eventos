import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository, type Repository } from "@/lib/data";
import { EVENT_STATUS_LABELS, type EventStatus, type Reservation } from "@/lib/domain/types";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/format";

type AgendaEntry = Awaited<ReturnType<Repository["events"]["listForAgenda"]>>[number];

const STATUS_TONE: Record<EventStatus, "brand" | "success" | "warning" | "danger" | "neutral" | "info"> = {
  rascunho: "neutral",
  planejamento: "info",
  aguardando_aprovacao: "warning",
  confirmado: "brand",
  em_execucao: "success",
  concluido: "neutral",
  cancelado: "danger",
};

const LEGEND_ITEMS: { label: string; swatchClass: string }[] = [
  { label: "Rascunho / Concluído", swatchClass: "bg-surface-muted border border-border" },
  { label: "Planejamento", swatchClass: "bg-info-50 border border-info-500/40" },
  { label: "Aguardando aprovação", swatchClass: "bg-warning-50 border border-warning-500/40" },
  { label: "Confirmado", swatchClass: "bg-brand-50 border border-brand-300" },
  { label: "Em execução", swatchClass: "bg-success-50 border border-success-500/40" },
  { label: "Cancelado", swatchClass: "bg-danger-50 border border-danger-500/40" },
];

interface SearchParams {
  view?: "mes" | "lista";
  month?: string; // YYYY-MM
  day?: string; // YYYY-MM-DD
}

type EventDayItem = { kind: "event"; id: string; event: AgendaEntry["event"]; sessions: AgendaEntry["sessions"] };
type ReservationDayItem = { kind: "reservation"; id: string; reservation: Reservation; spaceName: string };
type DayItem = EventDayItem | ReservationDayItem;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;
  const view = params.view ?? "mes";

  const today = new Date();
  const [year, month] = (params.month ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 0, 23, 59, 59);
  const gridStart = new Date(rangeStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(rangeEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const [items, standaloneReservations, spaces] = await Promise.all([
    repository.events.listForAgenda(session, { from: gridStart.toISOString(), to: gridEnd.toISOString() }),
    repository.reservations.list(session, {
      eventId: null,
      dataInicial: gridStart.toISOString(),
      dataFinal: gridEnd.toISOString(),
    }),
    repository.spaces.list(session),
  ]);
  const spaceById = new Map(spaces.map((s) => [s.id, s]));

  const byDay = new Map<string, DayItem[]>();
  for (const item of items) {
    for (const s of item.sessions) {
      const key = new Date(s.inicio).toDateString();
      const list = byDay.get(key) ?? [];
      if (!list.some((l) => l.kind === "event" && l.event.id === item.event.id)) {
        list.push({ kind: "event", id: item.event.id, event: item.event, sessions: item.sessions });
      }
      byDay.set(key, list);
    }
  }
  for (const reservation of standaloneReservations) {
    if (reservation.status === "cancelada") continue;
    const key = new Date(reservation.inicio).toDateString();
    const list = byDay.get(key) ?? [];
    list.push({ kind: "reservation", id: reservation.id, reservation, spaceName: spaceById.get(reservation.spaceId)?.nome ?? "Espaço" });
    byDay.set(key, list);
  }

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const prevMonth = new Date(year, month - 2, 1);
  const nextMonth = new Date(year, month, 1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(rangeStart);

  const selectedDay = params.day ? new Date(params.day + "T00:00:00") : null;
  const selectedDayItems = selectedDay ? byDay.get(selectedDay.toDateString()) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)] capitalize">{monthLabel}</h1>
          <p className="text-sm text-fg-muted">Agenda de eventos, sessões e reservas.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ButtonLink href={monthHref(prevMonth, view)} variant="secondary" size="sm">
            ← Anterior
          </ButtonLink>
          <ButtonLink href={monthHref(today, view)} variant="secondary" size="sm">
            Hoje
          </ButtonLink>
          <ButtonLink href={monthHref(nextMonth, view)} variant="secondary" size="sm">
            Próximo →
          </ButtonLink>
          <div className="ml-2 flex rounded-[var(--radius-sm)] border border-border overflow-hidden text-sm">
            <Link
              href={monthHref(rangeStart, "mes")}
              className={`px-3 py-1.5 ${view === "mes" ? "bg-brand-600 text-white" : "bg-white text-fg-muted"}`}
            >
              Mês
            </Link>
            <Link
              href={monthHref(rangeStart, "lista")}
              className={`px-3 py-1.5 ${view === "lista" ? "bg-brand-600 text-white" : "bg-white text-fg-muted"}`}
            >
              Lista
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${item.swatchClass}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">★</span> Estratégico
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-fg-muted" aria-hidden="true" />
          Reserva sem evento vinculado
        </span>
      </div>

      {view === "mes" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border-subtle text-xs font-semibold text-fg-muted uppercase">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="px-2 py-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = day.getMonth() === month - 1;
                const dayItems = byDay.get(day.toDateString()) ?? [];
                const isToday = day.toDateString() === today.toDateString();
                const dayParam = toDateParam(day);
                return (
                  <Link
                    key={day.toISOString()}
                    href={monthHref(rangeStart, "mes", dayParam)}
                    className={`min-h-24 border-b border-r border-border-subtle p-1.5 text-xs flex flex-col gap-1 hover:bg-surface-muted ${
                      inMonth ? "" : "bg-surface-muted/40 text-fg-muted"
                    } ${params.day === dayParam ? "ring-2 ring-inset ring-brand-500" : ""}`}
                  >
                    <span className={`font-medium ${isToday ? "text-brand-700" : ""}`}>{day.getDate()}</span>
                    {dayItems.slice(0, 2).map((item) =>
                      item.kind === "event" ? (
                        <span
                          key={item.id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${chipClass(item.event.status)}`}
                        >
                          {item.event.estrategico && "★ "}
                          {item.event.titulo}
                        </span>
                      ) : (
                        <span
                          key={item.id}
                          className="truncate rounded px-1 py-0.5 text-[10px] leading-tight border border-dashed border-fg-muted text-fg-muted"
                        >
                          {item.spaceName}
                        </span>
                      ),
                    )}
                    {dayItems.length > 2 && (
                      <span className="text-[10px] text-fg-muted">+{dayItems.length - 2} mais</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title={selectedDay ? formatDate(selectedDay.toISOString()) : "Selecione um dia"} />
            {!selectedDay ? (
              <EmptyState title="Clique em um dia no calendário para ver os eventos e reservas." />
            ) : selectedDayItems.length === 0 ? (
              <EmptyState title="Nenhum evento ou reserva neste dia." />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {selectedDayItems.map((item) =>
                  item.kind === "event" ? (
                    <li key={item.id} className="px-5 py-3">
                      <Link href={`/eventos/${item.event.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                        {item.event.estrategico && "★ "}
                        {item.event.titulo}
                      </Link>
                      <p className="text-xs text-fg-muted">{item.sessions.map((s) => formatTime(s.inicio)).join(", ")}</p>
                      <Badge tone={STATUS_TONE[item.event.status]} className="mt-1">
                        {EVENT_STATUS_LABELS[item.event.status]}
                      </Badge>
                    </li>
                  ) : (
                    <li key={item.id} className="px-5 py-3">
                      <Link href={`/reservas/${item.reservation.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                        {item.spaceName} — {item.reservation.motivo}
                      </Link>
                      <p className="text-xs text-fg-muted">{formatTime(item.reservation.inicio)}</p>
                      <Badge tone="neutral" className="mt-1">
                        Reserva sem evento
                      </Badge>
                    </li>
                  ),
                )}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader title="Eventos e reservas do período" />
          {items.length === 0 && standaloneReservations.length === 0 ? (
            <EmptyState title="Nenhum evento ou reserva no período." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {[...items]
                .sort((a, b) => a.sessions[0]?.inicio.localeCompare(b.sessions[0]?.inicio ?? "") ?? 0)
                .map(({ event, sessions }) => (
                  <li key={event.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <Link href={`/eventos/${event.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                        {event.estrategico && "★ "}
                        {event.titulo}
                      </Link>
                      <p className="text-xs text-fg-muted">
                        {sessions.map((s) => `${formatDate(s.inicio)} ${formatTime(s.inicio)}`).join(" · ")}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[event.status]}>{EVENT_STATUS_LABELS[event.status]}</Badge>
                  </li>
                ))}
              {standaloneReservations
                .filter((r) => r.status !== "cancelada")
                .sort((a, b) => a.inicio.localeCompare(b.inicio))
                .map((r) => (
                  <li key={r.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <Link href={`/reservas/${r.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                        {spaceById.get(r.spaceId)?.nome ?? "Espaço"} — {r.motivo}
                      </Link>
                      <p className="text-xs text-fg-muted">{formatDate(r.inicio)} {formatTime(r.inicio)}</p>
                    </div>
                    <Badge tone="neutral">Reserva sem evento</Badge>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function chipClass(status: EventStatus): string {
  const map: Record<EventStatus, string> = {
    rascunho: "bg-surface-muted text-fg-muted",
    planejamento: "bg-info-50 text-info-700",
    aguardando_aprovacao: "bg-warning-50 text-warning-700",
    confirmado: "bg-brand-50 text-brand-700",
    em_execucao: "bg-success-50 text-success-700",
    concluido: "bg-surface-muted text-fg-muted",
    cancelado: "bg-danger-50 text-danger-700",
  };
  return map[status];
}

function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthHref(d: Date, view: string, day?: string): string {
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const dayParam = day ? `&day=${day}` : "";
  return `/agenda?month=${month}&view=${view}${dayParam}`;
}
