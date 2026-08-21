import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { formatCurrency, formatDate } from "@/lib/format";

function Pct({ value }: { value: number | null }) {
  if (value == null) return <span className="text-fg-muted">—</span>;
  return (
    <span className={value >= 80 ? "text-success-700" : value >= 50 ? "text-warning-700" : "text-danger-700"}>
      {value.toFixed(0)}%
    </span>
  );
}

export default async function AdvancedReportsPage() {
  const session = await requireAuthSession();
  const repository = getRepository();
  const canViewFinancials = can(session.perfil, "view_financials");

  const data = await repository.reports.getAdvanced(session);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Relatórios", href: "/relatorios" }, { label: "Relatórios avançados" }]}
        backHref="/relatorios"
        title="Relatórios avançados"
        description="Indicadores agregados de toda a empresa: previsto x realizado, fornecedores, presença, ocupação, cronograma, checklist, período e histórico de eventos."
      />

      {canViewFinancials && (
        <Card>
          <CardHeader title="Previsto x realizado" description="Por evento com orçamento previsto, do mais executado ao menos." />
          {data.previstoRealizado.length === 0 ? (
            <EmptyState title="Nenhum evento com orçamento previsto cadastrado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-muted uppercase border-b border-border-subtle">
                    <th className="px-5 py-2">Evento</th>
                    <th className="px-5 py-2">Previsto</th>
                    <th className="px-5 py-2">Comprometido</th>
                    <th className="px-5 py-2">Realizado</th>
                    <th className="px-5 py-2">Saldo (vs. realizado)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.previstoRealizado.map((r) => (
                    <tr key={r.eventId} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-2 font-medium">
                        <Link href={`/eventos/${r.eventId}`} className="text-[var(--foreground)] hover:text-brand-700 hover:underline">
                          {r.eventTitulo}
                        </Link>
                      </td>
                      <td className="px-5 py-2 text-fg-muted">{formatCurrency(r.previsto)}</td>
                      <td className="px-5 py-2 text-fg-muted">{formatCurrency(r.comprometido)}</td>
                      <td className="px-5 py-2 text-fg-muted">{formatCurrency(r.realizado)}</td>
                      <td className={`px-5 py-2 ${r.previsto - r.realizado < 0 ? "text-danger-700" : "text-success-700"}`}>
                        {formatCurrency(r.previsto - r.realizado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader
          title="Fornecedores"
          description="Vínculos com eventos, do mais utilizado ao menos."
        />
        {data.fornecedores.length === 0 ? (
          <EmptyState title="Nenhum fornecedor vinculado a eventos ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-muted uppercase border-b border-border-subtle">
                  <th className="px-5 py-2">Fornecedor</th>
                  <th className="px-5 py-2">Categoria</th>
                  <th className="px-5 py-2">Eventos vinculados</th>
                  {canViewFinancials && <th className="px-5 py-2">Valor contratado (total)</th>}
                </tr>
              </thead>
              <tbody>
                {data.fornecedores.map((f) => (
                  <tr key={f.supplierId} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-2 font-medium">
                      <Link href={`/fornecedores/${f.supplierId}`} className="text-[var(--foreground)] hover:text-brand-700 hover:underline">
                        {f.supplierNome}
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-fg-muted">{f.categoria}</td>
                    <td className="px-5 py-2 text-fg-muted">{f.eventosVinculados}</td>
                    {canViewFinancials && (
                      <td className="px-5 py-2 text-fg-muted">
                        {f.valorContratado != null ? formatCurrency(f.valorContratado) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Presença" description="Inscrições confirmadas em todos os eventos." />
          <div className="p-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
              <p className="text-lg font-semibold text-[var(--foreground)]">{data.presenca.totalConfirmados}</p>
              <p className="text-xs text-fg-muted">Confirmados</p>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-success-50 p-3">
              <p className="text-lg font-semibold text-success-700">{data.presenca.totalPresentes}</p>
              <p className="text-xs text-fg-muted">Presentes</p>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
              <p className="text-lg font-semibold text-[var(--foreground)]">{data.presenca.totalAusentes}</p>
              <p className="text-xs text-fg-muted">Ausentes</p>
            </div>
          </div>
          <p className="px-5 pb-5 text-sm text-fg-muted">
            Taxa de presença: <Pct value={data.presenca.taxaPresencaPct} />
          </p>
        </Card>

        <Card>
          <CardHeader title="Ocupação de espaços" description="Próximos 30 dias, por espaço." />
          {data.ocupacao.length === 0 ? (
            <EmptyState title="Nenhum espaço cadastrado." />
          ) : (
            <ul className="px-5 pb-5 space-y-2">
              {data.ocupacao.map((o) => (
                <li key={o.spaceId} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[var(--foreground)]">{o.spaceNome}</span>
                    <span className="text-fg-muted">{o.percentual}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full" style={{ width: `${o.percentual}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Cumprimento do cronograma" description="Atividades não canceladas de todos os eventos." />
          <div className="p-5 space-y-2 text-sm">
            <p>
              <strong>{data.cronograma.concluidas}</strong> de <strong>{data.cronograma.totalAtividades}</strong> atividades
              concluídas — <Pct value={data.cronograma.taxaConclusaoPct} />
            </p>
            <p className="text-fg-muted">
              <Badge tone={data.cronograma.atrasadas > 0 ? "danger" : "success"}>
                {data.cronograma.atrasadas} atrasada(s) no momento
              </Badge>
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Conclusão de checklist" description="Itens não cancelados de todos os eventos." />
          <div className="p-5 text-sm">
            <p>
              <strong>{data.checklist.concluidos}</strong> de <strong>{data.checklist.totalItens}</strong> itens concluídos —{" "}
              <Pct value={data.checklist.taxaConclusaoPct} />
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Performance por período" description="Eventos agrupados pelo mês de criação." />
        {data.performancePorPeriodo.length === 0 ? (
          <EmptyState title="Nenhum evento cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-muted uppercase border-b border-border-subtle">
                  <th className="px-5 py-2">Período</th>
                  <th className="px-5 py-2">Eventos criados</th>
                  <th className="px-5 py-2">Concluídos</th>
                  <th className="px-5 py-2">Cancelados</th>
                </tr>
              </thead>
              <tbody>
                {data.performancePorPeriodo.map((p) => (
                  <tr key={p.periodo} className="border-b border-border-subtle last:border-0">
                    <td className="px-5 py-2 font-medium text-[var(--foreground)]">{p.periodo}</td>
                    <td className="px-5 py-2 text-fg-muted">{p.totalEventos}</td>
                    <td className="px-5 py-2 text-fg-muted">{p.concluidos}</td>
                    <td className="px-5 py-2 text-fg-muted">{p.cancelados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Histórico de eventos" description="Todos os eventos da empresa, do mais recente ao mais antigo." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-muted uppercase border-b border-border-subtle">
                <th className="px-5 py-2">Evento</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Criado em</th>
                <th className="px-5 py-2">Atualizado em</th>
                <th className="px-5 py-2">Mudanças de status</th>
              </tr>
            </thead>
            <tbody>
              {data.historicoEventos.map((e) => (
                <tr key={e.eventId} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-2 font-medium">
                    <Link href={`/eventos/${e.eventId}`} className="text-[var(--foreground)] hover:text-brand-700 hover:underline">
                      {e.eventTitulo}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-fg-muted">{EVENT_STATUS_LABELS[e.status]}</td>
                  <td className="px-5 py-2 text-fg-muted">{formatDate(e.createdAt)}</td>
                  <td className="px-5 py-2 text-fg-muted">{formatDate(e.updatedAt)}</td>
                  <td className="px-5 py-2 text-fg-muted">{e.mudancasDeStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
