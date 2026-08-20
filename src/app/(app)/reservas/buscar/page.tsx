import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { RESERVATION_STATUS_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Field, Select, Badge, EmptyState, Banner } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/domain/permissions";
import { updateReservationStatus } from "../actions";

interface SearchParams {
  spaceId?: string;
  status?: string;
  created?: string;
}

export default async function SearchReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;

  const [spaces, results] = await Promise.all([
    repository.spaces.list(session),
    repository.reservations.list(session, {
      spaceId: params.spaceId || undefined,
      status: params.status || undefined,
    }),
  ]);

  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const canManage = can(session.perfil, "manage_reservations");

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Reservas</h1>
          <p className="text-sm text-fg-muted">Todas as reservas da empresa. Use os filtros para refinar.</p>
        </div>
        <ButtonLink href="/reservas/nova" size="sm">
          Nova reserva
        </ButtonLink>
      </div>

      {params.created && <Banner tone="success">Reserva criada com sucesso.</Banner>}

      <Card>
        <form className="p-5 grid sm:grid-cols-3 gap-4 items-end">
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
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={params.status ?? ""}>
              <option value="">Todos</option>
              {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Resultados" description={`${results.length} reserva(s) encontrada(s)`} />
        {results.length === 0 ? (
          <EmptyState title="Nenhuma reserva encontrada para os filtros informados." />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {results.map((reservation) => {
              const space = spaceById.get(reservation.spaceId);
              const contextLabel = `reserva de ${space?.nome ?? "espaço"} (${reservation.motivo})`;
              return (
                <li key={reservation.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <Link href={`/reservas/${reservation.id}`} className="min-w-0 hover:text-brand-700">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {space?.nome ?? "Espaço"} — {reservation.motivo}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatDateTime(reservation.inicio)} até {formatDateTime(reservation.fim)}
                      {reservation.eventId && " · vinculada a um evento"}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(reservation.status)}>{RESERVATION_STATUS_LABELS[reservation.status]}</Badge>
                    {canManage && reservation.status !== "cancelada" && reservation.status !== "concluida" && (
                      <ConfirmButton
                        size="sm"
                        variant="secondary"
                        title="Cancelar reserva"
                        description={`A ${contextLabel} será cancelada e o período ficará disponível novamente.`}
                        confirmLabel="Cancelar reserva"
                        aria-label={`Cancelar ${contextLabel}`}
                        onConfirm={updateReservationStatus.bind(null, reservation.id, "cancelada")}
                      >
                        Cancelar
                      </ConfirmButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function statusTone(status: string): "success" | "warning" | "neutral" | "danger" {
  if (status === "confirmada") return "success";
  if (status === "solicitada") return "warning";
  if (status === "cancelada") return "danger";
  return "neutral";
}
