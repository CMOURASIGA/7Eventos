import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/format";
import type { AtlasFinancialAnalysis } from "@/lib/atlas/types";

/**
 * Atlas (Fase 3) - análise financeira aprofundada (seção 8).
 *
 * Componente de servidor, sem interatividade — assim como
 * RiskSignalsCard.tsx, os números vêm de financialEngine.ts, não do
 * provedor de IA. Só renderiza quando a sessão tem view_financials
 * (page.tsx só passa `analysis` quando context.financeiroDetalhado não é
 * null) — o mesmo controle de acesso já aplicado ao restante do produto.
 */
export function FinancialAnalysisCard({ analysis }: { analysis: AtlasFinancialAnalysis }) {
  const { porCategoria, concentracao, indicadores, pontosDeAtencao } = analysis;

  return (
    <Card>
      <CardHeader
        title="Análise financeira"
        description="Cotado, contratado e realizado por categoria — calculado diretamente dos dados do evento."
      />
      <div className="p-5 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Indicador label="% executado" value={indicadores.percentualExecutado != null ? `${indicadores.percentualExecutado.toFixed(0)}%` : "—"} />
          <Indicador label="Saldo (previsto - realizado)" value={formatCurrency(indicadores.saldoRealizado)} />
          <Indicador label="Ticket médio por item" value={indicadores.ticketMedioPorItem != null ? formatCurrency(indicadores.ticketMedioPorItem) : "—"} />
          <Indicador label="Itens sem valor realizado" value={String(indicadores.itensSemValorRealizado)} />
        </div>

        {concentracao && (
          <div className="text-sm">
            <span className="text-xs text-fg-muted uppercase tracking-wide">Concentração de custo: </span>
            <span className="text-[var(--foreground)]">
              &ldquo;{concentracao.categoria}&rdquo; representa {concentracao.percentualDoTotal.toFixed(0)}% do total.
            </span>
          </div>
        )}

        <div>
          <p className="text-xs text-fg-muted uppercase tracking-wide mb-2">Por categoria ({porCategoria.length})</p>
          {porCategoria.length === 0 ? (
            <EmptyState title="Nenhum item de orçamento registrado ainda." description="Cadastre itens na aba Financeiro do evento para ver a análise por categoria." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-muted uppercase tracking-wide">
                    <th className="pb-2 pr-3 font-medium">Categoria</th>
                    <th className="pb-2 pr-3 font-medium">Cotado</th>
                    <th className="pb-2 pr-3 font-medium">Contratado</th>
                    <th className="pb-2 pr-3 font-medium">Realizado</th>
                    <th className="pb-2 font-medium">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {porCategoria.map((c) => (
                    <tr key={c.categoria} className="border-t border-border-subtle">
                      <td className="py-1.5 pr-3 text-[var(--foreground)]">
                        {c.categoria}
                        {c.acimaDoCotado && (
                          <Badge tone="danger" className="ml-1.5">
                            acima do cotado
                          </Badge>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-fg-muted">{formatCurrency(c.cotado)}</td>
                      <td className="py-1.5 pr-3 text-fg-muted">{formatCurrency(c.contratado)}</td>
                      <td className="py-1.5 pr-3 text-fg-muted">{formatCurrency(c.realizado)}</td>
                      <td className="py-1.5 text-fg-muted">
                        {c.variacaoContratadoCotadoPercentual != null ? `${c.variacaoContratadoCotadoPercentual > 0 ? "+" : ""}${c.variacaoContratadoCotadoPercentual.toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pontosDeAtencao.length > 0 && (
          <div>
            <p className="text-xs text-fg-muted uppercase tracking-wide mb-1.5">Pontos de atenção</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-[var(--foreground)]">
              {pontosDeAtencao.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function Indicador({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-fg-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[var(--foreground)] font-medium">{value}</p>
    </div>
  );
}
