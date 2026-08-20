import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Card, CardHeader, Field, Input, Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  criacao: "Criação",
  edicao: "Edição",
  alteracao_status: "Alteração de status",
  reserva: "Reserva",
  cancelamento: "Cancelamento",
  conclusao: "Conclusão",
  login: "Login",
  administrativo: "Administrativo",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ dataInicial?: string; dataFinal?: string; entidade?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "view_audit")) redirect("/dashboard?negado=1");

  const repository = getRepository();
  const users = await repository.users.list(session);
  const userById = new Map(users.map((u) => [u.id, u]));
  const params = await searchParams;

  const logs = await repository.audit.list(session, {
    entidade: params.entidade || undefined,
    dataInicial: params.dataInicial ? new Date(params.dataInicial).toISOString() : undefined,
    dataFinal: params.dataFinal ? new Date(params.dataFinal).toISOString() : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="page-hero">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Auditoria</h1>
        <p className="text-sm text-fg-muted">Trilha de operações relevantes: criação, edição, status, reservas, cancelamentos e alterações administrativas.</p>
      </div>

      <Card>
        <form className="p-5 grid sm:grid-cols-3 gap-4 items-end">
          <Field label="Entidade" htmlFor="entidade">
            <Input id="entidade" name="entidade" defaultValue={params.entidade} placeholder="evento, espaco, reserva..." />
          </Field>
          <Field label="Data inicial" htmlFor="dataInicial">
            <Input id="dataInicial" name="dataInicial" type="date" defaultValue={params.dataInicial} />
          </Field>
          <Field label="Data final" htmlFor="dataFinal">
            <Input id="dataFinal" name="dataFinal" type="date" defaultValue={params.dataFinal} />
          </Field>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Registros" description={`${logs.length} evento(s) de auditoria`} />
        {logs.length === 0 ? (
          <EmptyState title="Nenhum registro de auditoria encontrado." />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-3 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-[var(--foreground)]">{log.descricao}</p>
                  <p className="text-xs text-fg-muted">
                    {userById.get(log.userId)?.nome ?? log.userId} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
                <Badge tone="neutral">{ACTION_LABELS[log.acao] ?? log.acao}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
