import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Card, CardHeader, Badge, EmptyState, Banner } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { ICONS } from "@/components/layout/icons";

export default async function EspacosHubPage({
  searchParams,
}: {
  searchParams: Promise<{ negado?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { negado } = await searchParams;
  const spaces = await repository.spaces.list(session);
  const canManage = can(session.perfil, "manage_spaces");
  const canManageReservations = can(session.perfil, "manage_reservations");

  return (
    <div className="space-y-6">
      {negado === "1" && <Banner tone="warning">Você não tem permissão para acessar essa funcionalidade.</Banner>}
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Espaços</h1>
          <p className="text-sm text-fg-muted">Cadastro, busca e disponibilidade de espaços para eventos.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canManage && (
            <ButtonLink href="/espacos/novo" size="sm">
              <ICONS.plus /> Novo espaço
            </ButtonLink>
          )}
          <ButtonLink href="/espacos/buscar" variant="secondary" size="sm">
            <ICONS.search /> Buscar espaço
          </ButtonLink>
          {canManageReservations && (
            <ButtonLink href="/reservas/nova" variant="secondary" size="sm">
              Nova reserva
            </ButtonLink>
          )}
          <ButtonLink href="/reservas/disponibilidade" variant="secondary" size="sm">
            Verificar disponibilidade
          </ButtonLink>
        </div>
      </div>

      <Card>
        <CardHeader title="Todos os espaços" description={`${spaces.length} cadastrados`} />
        {spaces.length === 0 ? (
          <EmptyState
            title="Nenhum espaço cadastrado"
            description="Cadastre o primeiro espaço para começar a organizar reservas e eventos."
            action={canManage && <ButtonLink href="/espacos/novo">Novo espaço</ButtonLink>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/espacos/${space.id}`}
                className="block rounded-[var(--radius-md)] border border-border-subtle p-4 hover:border-brand-300 hover:shadow-[var(--shadow-sm)] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-[var(--foreground)]">{space.nome}</p>
                  <Badge tone={space.status === "ativo" ? "success" : "neutral"}>
                    {space.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-fg-muted mt-1">{space.local}</p>
                <p className="text-xs text-fg-muted mt-2">Capacidade: {space.capacidade} pessoas</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
