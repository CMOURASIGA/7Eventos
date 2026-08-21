import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { NOTIFICATION_TYPE_LABELS, type NotificationType } from "@/lib/domain/types";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";

const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { tipo } = await searchParams;

  const notifications = await repository.notifications.list(session);
  const activeType = NOTIFICATION_TYPES.includes(tipo as NotificationType) ? (tipo as NotificationType) : undefined;
  const visible = activeType ? notifications.filter((n) => n.type === activeType) : notifications;

  const countByType = new Map<NotificationType, number>();
  for (const n of notifications) countByType.set(n.type, (countByType.get(n.type) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Notificações</h1>
        <p className="text-sm text-fg-muted">
          Alertas operacionais computados a partir dos eventos da empresa — prazos, atrasos, bloqueios, mudanças de
          status e mais. Atualiza a cada visita, sem depender de e-mail ou WhatsApp.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/notificacoes"
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            !activeType
              ? "bg-brand-600 border-brand-600 text-white"
              : "border-border text-fg-muted hover:text-[var(--foreground)] hover:border-border-strong"
          }`}
        >
          Todas ({notifications.length})
        </Link>
        {NOTIFICATION_TYPES.filter((t) => (countByType.get(t) ?? 0) > 0).map((t) => (
          <Link
            key={t}
            href={`/notificacoes?tipo=${t}`}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeType === t
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-border text-fg-muted hover:text-[var(--foreground)] hover:border-border-strong"
            }`}
          >
            {NOTIFICATION_TYPE_LABELS[t]} ({countByType.get(t)})
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title="Alertas" description={`${visible.length} no total`} />
        {visible.length === 0 ? (
          <EmptyState
            title="Nenhum alerta encontrado"
            description={
              notifications.length === 0
                ? "Nenhuma pendência identificada nos eventos da empresa no momento."
                : "Ajuste o filtro para ver outros tipos de alerta."
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {visible.map((n) => (
              <li key={n.id} className="px-5 py-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2 flex-wrap">
                    <Badge tone={n.severity}>{NOTIFICATION_TYPE_LABELS[n.type]}</Badge>
                    {n.titulo}
                  </p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    <Link href={`/eventos/${n.eventId}`} className="hover:text-brand-700 hover:underline">
                      {n.eventTitulo}
                    </Link>{" "}
                    · {formatDateTime(n.referenceAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
