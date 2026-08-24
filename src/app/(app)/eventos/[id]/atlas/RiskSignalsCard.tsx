import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/primitives";
import type { AtlasDetectedRisk, AtlasSuggestedAction } from "@/lib/atlas/types";

/**
 * Atlas (Fase 3) - motor de riscos (seção 6) + próximas ações (seção 7).
 *
 * Componente de servidor, sem interatividade — ao contrário do chat e do
 * resumo executivo (AtlasPanel.tsx), estas duas listas são calculadas de
 * forma determinística (riskEngine.ts/actionEngine.ts), sem nenhuma
 * chamada ao provedor de IA. Por isso ficam visíveis mesmo quando
 * OPENAI_API_KEY não está configurada — ver page.tsx.
 */

const SEVERITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  critica: "danger",
  alta: "danger",
  media: "warning",
  baixa: "neutral",
};

const SEVERITY_LABEL: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function RiskSignalsCard({ risks, actions }: { risks: AtlasDetectedRisk[]; actions: AtlasSuggestedAction[] }) {
  return (
    <Card>
      <CardHeader
        title="Riscos detectados e próximas ações"
        description="Calculado diretamente dos dados do evento — não depende do provedor de IA estar configurado."
      />
      <div className="p-5 space-y-6">
        <div>
          <p className="text-xs text-fg-muted uppercase tracking-wide mb-2">Riscos ({risks.length})</p>
          {risks.length === 0 ? (
            <EmptyState title="Nenhum risco detectado no momento." description="O motor de riscos revisa checklist, cronograma, reservas, fornecedores, documentos e orçamento." />
          ) : (
            <ul className="space-y-3">
              {risks.map((r) => (
                <li key={r.codigo} className="border border-border rounded-[var(--radius-sm)] p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Badge tone={SEVERITY_TONE[r.severidade] ?? "neutral"}>{SEVERITY_LABEL[r.severidade] ?? r.severidade}</Badge>
                    <span className="text-sm font-medium text-[var(--foreground)]">{r.descricao}</span>
                  </div>
                  <p className="text-xs text-fg-muted">{r.evidencia}</p>
                  <p className="text-xs text-fg-muted mt-1">
                    <span className="font-medium">Impacto:</span> {r.impacto}
                  </p>
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium">Recomendação:</span> {r.recomendacao}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs text-fg-muted uppercase tracking-wide mb-2">Próximas ações sugeridas ({actions.length})</p>
          {actions.length === 0 ? (
            <EmptyState title="Nenhuma ação sugerida no momento." description="Sugestões aparecem aqui a partir dos riscos e pendências detectados." />
          ) : (
            <ul className="space-y-3">
              {actions.map((a, idx) => (
                <li key={idx} className="border border-border rounded-[var(--radius-sm)] p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Badge tone={SEVERITY_TONE[a.prioridade] ?? "neutral"}>{SEVERITY_LABEL[a.prioridade] ?? a.prioridade}</Badge>
                    <span className="text-sm font-medium text-[var(--foreground)]">{a.acao}</span>
                  </div>
                  <p className="text-xs text-fg-muted">{a.justificativa}</p>
                  <p className="text-xs text-fg-muted mt-1">
                    <span className="font-medium">Prazo sugerido:</span> {a.prazoSugerido}
                    {a.responsavelSugerido ? (
                      <>
                        {" · "}
                        <span className="font-medium">Responsável sugerido:</span> {a.responsavelSugerido}
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-fg-muted mt-3">
            Estas são apenas sugestões — nenhuma tarefa é criada automaticamente. Use o checklist do evento para registrar o que for confirmado.
          </p>
        </div>
      </div>
    </Card>
  );
}
