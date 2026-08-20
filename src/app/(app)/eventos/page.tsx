import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Badge, EmptyState, Banner } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { ICONS } from "@/components/layout/icons";
import { formatDate } from "@/lib/format";

export default async function EventosHubPage({
  searchParams,
}: {
  searchParams: Promise<{ negado?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { negado } = await searchParams;
  const canCreate = can(session.perfil, "create_edit_event");
  const canManageReservations = can(session.perfil, "manage_reservations");
  const recent = await repository.events.search(session, {});

  return (
    <div className="space-y-6">
      {negado === "1" && <Banner tone="warning">Você não tem permissão para acessar essa funcionalidade.</Banner>}
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Eventos</h1>
          <p className="text-sm text-fg-muted">Fonte única de verdade operacional de cada evento.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCreate && (
            <ButtonLink href="/eventos/novo" size="sm">
              <ICONS.plus /> Novo evento
            </ButtonLink>
          )}
          {canManageReservations && (
            <ButtonLink href="/reservas/nova" variant="secondary" size="sm">
              Reserva rápida
            </ButtonLink>
          )}
          <ButtonLink href="/agenda" variant="secondary" size="sm">
            <ICONS.calendar /> Ver agenda
          </ButtonLink>
          <ButtonLink href="/eventos/buscar" variant="secondary" size="sm">
            <ICONS.search /> Buscar eventos
          </ButtonLink>
        </div>
      </div>

      <Card>
        <CardHeader title="Eventos recentes" description={`${recent.length} no total`} />
        {recent.length === 0 ? (
          <EmptyState
            title="Nenhum evento cadastrado"
            description="Crie o primeiro evento para começar a organizar sua operação."
            action={canCreate && <ButtonLink href="/eventos/novo">Novo evento</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {recent.slice(0, 12).map((event) => (
              <li key={event.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/eventos/${event.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                    {event.titulo}
                  </Link>
                  <p className="text-xs text-fg-muted">
                    {event.demandante} · atualizado em {formatDate(event.updatedAt)}
                  </p>
                </div>
                <Badge tone="brand">{EVENT_STATUS_LABELS[event.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
