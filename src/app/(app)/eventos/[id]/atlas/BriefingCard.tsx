import type { ReactNode } from "react";
import { Card, CardHeader, Badge } from "@/components/ui/primitives";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AtlasBriefing } from "@/lib/atlas/types";

/**
 * Atlas (Fase 3) - preparação operacional / briefing (seção 9).
 *
 * Componente de servidor — assim como RiskSignalsCard/FinancialAnalysisCard,
 * o conteúdo vem de briefingEngine.ts, não do provedor de IA, então fica
 * sempre visível independente de OPENAI_API_KEY. Fica recolhido por
 * padrão (<details>) por ser o conteúdo mais longo da página.
 */
export function BriefingCard({ briefing }: { briefing: AtlasBriefing }) {
  // Ressalva do validador: quem não tem view_financials (briefing.orcamento
  // null) não deveria ver "orçamento" anunciado na descrição — gera
  // expectativa de um dado que a seção abaixo não vai mostrar.
  const descricaoSecoes = [
    "Objetivo, agenda, espaço, equipe, fornecedores, cronograma, checklist, participantes, riscos",
    briefing.orcamento ? ", orçamento" : "",
    " e contatos essenciais — consolidado em um só lugar. Clique para expandir.",
  ].join("");

  return (
    <Card>
      <details>
        <summary className="cursor-pointer list-none">
          <CardHeader title="Briefing operacional" description={descricaoSecoes} />
        </summary>
        <div className="p-5 space-y-6 text-sm">
          <Secao titulo="Evento">
            <p className="text-[var(--foreground)]">
              <span className="font-medium">{briefing.evento.titulo}</span> · {briefing.evento.categoria}
            </p>
            <p className="text-fg-muted mt-1">{briefing.evento.objetivo ?? "Objetivo não informado."}</p>
            {briefing.evento.publicoAlvo && <p className="text-fg-muted mt-1">Público-alvo: {briefing.evento.publicoAlvo}</p>}
          </Secao>

          <Secao titulo="Espaço">
            {briefing.espaco ? (
              <p className="text-[var(--foreground)]">
                {briefing.espaco.nome} — {briefing.espaco.local} (capacidade: {briefing.espaco.capacidade})
              </p>
            ) : (
              <p className="text-fg-muted">Espaço não definido.</p>
            )}
          </Secao>

          <Secao titulo={`Agenda (${briefing.agenda.length})`}>
            {briefing.agenda.length === 0 ? (
              <p className="text-fg-muted">Nenhuma sessão registrada.</p>
            ) : (
              <ul className="space-y-1 text-[var(--foreground)]">
                {briefing.agenda.map((a, idx) => (
                  <li key={idx}>
                    {formatDateTime(a.inicio)} até {formatDateTime(a.fim)}
                    {a.observacao ? ` — ${a.observacao}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo={`Equipe (${briefing.equipe.length})`}>
            {briefing.equipe.length === 0 ? (
              <p className="text-fg-muted">Nenhum integrante alocado.</p>
            ) : (
              <ul className="space-y-1 text-[var(--foreground)]">
                {briefing.equipe.map((m, idx) => (
                  <li key={idx}>
                    {m.nome} — {m.funcao} <span className="text-fg-muted">({m.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo={`Fornecedores (${briefing.fornecedores.length})`}>
            {briefing.fornecedores.length === 0 ? (
              <p className="text-fg-muted">Nenhum fornecedor vinculado.</p>
            ) : (
              <ul className="space-y-1 text-[var(--foreground)]">
                {briefing.fornecedores.map((f, idx) => (
                  <li key={idx}>
                    {f.nome} — {f.servico} <span className="text-fg-muted">({f.situacao})</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo={`Cronograma (${briefing.cronograma.length})`}>
            {briefing.cronograma.length === 0 ? (
              <p className="text-fg-muted">Nenhuma atividade registrada.</p>
            ) : (
              <ul className="space-y-1 text-[var(--foreground)]">
                {briefing.cronograma.map((c, idx) => (
                  <li key={idx}>
                    {c.titulo} — {formatDateTime(c.inicio)} <span className="text-fg-muted">({c.status}{c.responsavel ? ` · ${c.responsavel}` : ""})</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo={`Checklist (${briefing.checklist.length})`}>
            {briefing.checklist.length === 0 ? (
              <p className="text-fg-muted">Nenhum item registrado.</p>
            ) : (
              <ul className="space-y-1 text-[var(--foreground)]">
                {briefing.checklist.map((c, idx) => (
                  <li key={idx}>
                    {c.titulo} — {c.categoria} <span className="text-fg-muted">({c.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Participantes">
            <p className="text-[var(--foreground)]">
              {briefing.participantes.confirmados} confirmado(s) de {briefing.participantes.inscritos} inscrito(s).
            </p>
          </Secao>

          <Secao titulo={`Riscos (${briefing.riscos.length})`}>
            {briefing.riscos.length === 0 ? (
              <p className="text-fg-muted">Nenhum risco detectado.</p>
            ) : (
              <ul className="space-y-1">
                {briefing.riscos.map((r) => (
                  <li key={r.codigo} className="flex items-start gap-2">
                    <Badge tone={r.severidade === "critica" || r.severidade === "alta" ? "danger" : r.severidade === "media" ? "warning" : "neutral"}>
                      {r.severidade}
                    </Badge>
                    <span className="text-[var(--foreground)]">{r.descricao}</span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          {briefing.orcamento && (
            <Secao titulo="Orçamento">
              <p className="text-[var(--foreground)]">
                Previsto: {formatCurrency(briefing.orcamento.orcamentoPrevisto)} · Contratado: {formatCurrency(briefing.orcamento.comprometido)} · Realizado:{" "}
                {formatCurrency(briefing.orcamento.realizado)}
              </p>
            </Secao>
          )}

          <Secao titulo={`Contatos essenciais (${briefing.contatosEssenciais.length})`}>
            {briefing.contatosEssenciais.length === 0 ? (
              <p className="text-fg-muted">Nenhum contato registrado.</p>
            ) : (
              <ul className="space-y-1 text-[var(--foreground)]">
                {briefing.contatosEssenciais.map((c, idx) => (
                  <li key={idx}>
                    {c.nome} — {c.papel}: {c.contato}
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      </details>
    </Card>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-fg-muted uppercase tracking-wide mb-1.5">{titulo}</p>
      {children}
    </div>
  );
}
