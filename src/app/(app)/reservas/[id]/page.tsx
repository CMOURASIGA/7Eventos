import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { RESERVATION_STATUS_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Badge, Banner, Field, Select, EmptyState } from "@/components/ui/primitives";
import { ButtonLink, Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { formatDateTime } from "@/lib/format";
import { updateReservationStatus, linkReservationToEvent } from "../actions";

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; linked?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;
  const { error, linked } = await searchParams;

  const reservation = await repository.reservations.get(session, id);
  if (!reservation) notFound();

  const [space, solicitante, event] = await Promise.all([
    repository.spaces.get(session, reservation.spaceId),
    repository.users.get(session, reservation.solicitanteId),
    reservation.eventId ? repository.events.get(session, reservation.eventId) : Promise.resolve(null),
  ]);
  const canManage = can(session.perfil, "manage_reservations");

  const availableEvents = !reservation.eventId
    ? await repository.events.search(session, {})
    : [];

  const contextLabel = `reserva de ${space?.nome ?? "espaço"} (${reservation.motivo})`;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Reservas", href: "/reservas/buscar" }, { label: reservation.motivo }]}
        backHref="/reservas/buscar"
        backLabel="Voltar para reservas"
        title={
          <span className="flex items-center gap-2 flex-wrap">
            {reservation.motivo}
            <Badge tone={statusTone(reservation.status)}>{RESERVATION_STATUS_LABELS[reservation.status]}</Badge>
          </span>
        }
        description={space?.nome ?? "Espaço"}
        actions={
          canManage &&
          reservation.status !== "cancelada" &&
          reservation.status !== "concluida" && (
            <ConfirmButton
              size="sm"
              title="Cancelar reserva"
              description={`A ${contextLabel} será cancelada e o período ficará disponível novamente.`}
              confirmLabel="Cancelar reserva"
              aria-label={`Cancelar ${contextLabel}`}
              onConfirm={updateReservationStatus.bind(null, id, "cancelada")}
            >
              Cancelar reserva
            </ConfirmButton>
          )
        }
      />

      {error && <Banner tone="danger">{error}</Banner>}
      {linked === "1" && <Banner tone="success">Reserva vinculada ao evento com sucesso.</Banner>}

      <Card>
        <CardHeader title="Dados da reserva" />
        <dl className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <Info label="Espaço" value={space?.nome ?? "—"} />
          <Info label="Local" value={space?.local ?? "—"} />
          <Info label="Início" value={formatDateTime(reservation.inicio)} />
          <Info label="Fim" value={formatDateTime(reservation.fim)} />
          <Info label="Quantidade de pessoas" value={reservation.quantidadePessoas ? String(reservation.quantidadePessoas) : "—"} />
          <Info label="Solicitante" value={solicitante?.nome ?? "—"} />
          <Info label="Criada em" value={formatDateTime(reservation.createdAt)} />
          <Info label="Atualizada em" value={formatDateTime(reservation.updatedAt)} />
        </dl>
        <div className="px-5 pb-5">
          <p className="text-xs text-fg-muted uppercase tracking-wide mb-1">Motivo</p>
          <p className="text-sm text-[var(--foreground)]">{reservation.motivo}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Evento vinculado" />
        {event ? (
          <div className="p-5">
            <ButtonLink href={`/eventos/${event.id}`} variant="secondary" size="sm">
              Ver evento: {event.titulo}
            </ButtonLink>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <EmptyState
              title="Esta reserva ainda não está vinculada a um evento"
              description="Reservas rápidas podem ser associadas a um evento depois, sem precisar recriar os dados."
            />
            {canManage && availableEvents.length > 0 && (
              <form action={linkReservationToEvent.bind(null, id)} className="flex flex-wrap items-end gap-3">
                <Field label="Vincular a um evento existente" htmlFor="eventId">
                  <Select id="eventId" name="eventId" required defaultValue="">
                    <option value="" disabled>
                      Selecione um evento
                    </option>
                    {availableEvents.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.titulo}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" variant="secondary" size="sm">
                  Vincular
                </Button>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted uppercase tracking-wide">{label}</dt>
      <dd className="text-[var(--foreground)] mt-0.5">{value}</dd>
    </div>
  );
}

function statusTone(status: string): "success" | "warning" | "neutral" | "danger" {
  if (status === "confirmada") return "success";
  if (status === "solicitada") return "warning";
  if (status === "cancelada") return "danger";
  return "neutral";
}
