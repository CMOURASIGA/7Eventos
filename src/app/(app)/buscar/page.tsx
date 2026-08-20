import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { EVENT_STATUS_LABELS, ROLE_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Field, Input, Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";

/** Busca global: procura em eventos, espaços, reservas e usuários ao mesmo tempo. */
export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [events, spaces, reservations, users] = query
    ? await Promise.all([
        repository.events.search(session, { texto: query }),
        repository.spaces.list(session, { nome: query }),
        repository.reservations.list(session),
        can(session.perfil, "manage_company_users") ? repository.users.list(session) : Promise.resolve([]),
      ])
    : [[], [], [], []];

  const matchingReservations = query
    ? reservations.filter((r) => r.motivo.toLowerCase().includes(query.toLowerCase()))
    : [];
  const matchingUsers = query
    ? users.filter((u) => u.nome.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
    : [];

  const spaceById = new Map((await repository.spaces.list(session)).map((s) => [s.id, s]));
  const totalResults = events.length + spaces.length + matchingReservations.length + matchingUsers.length;

  return (
    <div className="space-y-6">
      <PageHeader breadcrumb={[{ label: "Busca" }]} backHref="/dashboard" title="Busca global" description="Pesquise eventos, espaços, reservas e usuários." />

      <Card>
        <form className="p-5 flex gap-3">
          <div className="flex-1">
            <Field label="Termo de busca" htmlFor="q">
              <Input id="q" name="q" defaultValue={query} autoFocus placeholder="Nome do evento, espaço, reserva ou pessoa..." />
            </Field>
          </div>
          <Button type="submit" className="self-end">
            Buscar
          </Button>
        </form>
      </Card>

      {!query ? (
        <Card>
          <EmptyState title="Digite um termo para buscar em todo o sistema." />
        </Card>
      ) : totalResults === 0 ? (
        <Card>
          <EmptyState title={`Nenhum resultado para "${query}"`} />
        </Card>
      ) : (
        <div className="space-y-4">
          {events.length > 0 && (
            <Card>
              <CardHeader title="Eventos" description={`${events.length} resultado(s)`} />
              <ul className="divide-y divide-border-subtle">
                {events.slice(0, 10).map((e) => (
                  <li key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <Link href={`/eventos/${e.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                      {e.titulo}
                    </Link>
                    <Badge tone="brand">{EVENT_STATUS_LABELS[e.status]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {spaces.length > 0 && (
            <Card>
              <CardHeader title="Espaços" description={`${spaces.length} resultado(s)`} />
              <ul className="divide-y divide-border-subtle">
                {spaces.slice(0, 10).map((s) => (
                  <li key={s.id} className="px-5 py-3">
                    <Link href={`/espacos/${s.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                      {s.nome}
                    </Link>
                    <p className="text-xs text-fg-muted">{s.local}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {matchingReservations.length > 0 && (
            <Card>
              <CardHeader title="Reservas" description={`${matchingReservations.length} resultado(s)`} />
              <ul className="divide-y divide-border-subtle">
                {matchingReservations.slice(0, 10).map((r) => (
                  <li key={r.id} className="px-5 py-3">
                    <Link href={`/reservas/${r.id}`} className="text-sm font-medium text-[var(--foreground)] hover:text-brand-700">
                      {spaceById.get(r.spaceId)?.nome ?? "Espaço"} — {r.motivo}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {matchingUsers.length > 0 && (
            <Card>
              <CardHeader title="Usuários" description={`${matchingUsers.length} resultado(s)`} />
              <ul className="divide-y divide-border-subtle">
                {matchingUsers.slice(0, 10).map((u) => (
                  <li key={u.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{u.nome}</p>
                    <p className="text-xs text-fg-muted">{ROLE_LABELS[u.perfil]}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
