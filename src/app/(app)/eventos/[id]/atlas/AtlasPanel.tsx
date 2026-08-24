"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, Badge, Textarea, EmptyState, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import type { AtlasChatTurn } from "@/lib/atlas/types";
import type { AtlasSummary } from "@/lib/atlas/summary";
import { askAtlasAction, generateSummaryAction } from "./actions";

const SEVERITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  critica: "danger",
  alta: "danger",
  media: "warning",
  baixa: "neutral",
};

const SUGGESTED_QUESTIONS = [
  "Qual a situação deste evento?",
  "O que está pendente?",
  "O que está atrasado?",
  "Quais são os principais riscos?",
  "Como está o orçamento?",
];

export function AtlasPanel({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<AtlasChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPending, startChatTransition] = useTransition();

  const [summary, setSummary] = useState<AtlasSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryPending, startSummaryTransition] = useTransition();

  function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || chatPending) return;
    setChatError(null);
    const nextMessages: AtlasChatTurn[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    startChatTransition(async () => {
      const result = await askAtlasAction(eventId, trimmed, messages);
      if (result.ok) {
        setMessages([...nextMessages, { role: "assistant", content: result.resposta }]);
      } else {
        setChatError(result.error);
      }
    });
  }

  function generateSummary() {
    setSummaryError(null);
    startSummaryTransition(async () => {
      const result = await generateSummaryAction(eventId);
      if (result.ok) {
        setSummary(result.summary);
      } else {
        setSummaryError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Resumo executivo"
          description="Situação, próximos marcos, pendências, riscos e recomendações — só com o que os dados deste evento realmente mostram."
          actions={
            <Button size="sm" variant="secondary" onClick={generateSummary} disabled={summaryPending}>
              {summaryPending ? "Gerando..." : summary ? "Gerar novamente" : "Gerar resumo"}
            </Button>
          }
        />
        <div className="p-5">
          {summaryError && (
            <div className="mb-4">
              <Banner tone="danger">{summaryError}</Banner>
            </div>
          )}
          {!summary && !summaryPending && !summaryError && (
            <EmptyState title="Nenhum resumo gerado ainda." description="Clique em “Gerar resumo” para o Atlas montar um panorama deste evento." />
          )}
          {summaryPending && <p className="text-sm text-fg-muted">Atlas está analisando o evento...</p>}
          {summary && <SummaryView summary={summary} />}
        </div>
      </Card>

      <Card>
        <CardHeader title="Perguntar ao Atlas" description="Pergunte sobre este evento — Atlas responde só com base nos dados que você tem permissão de ver." />
        <div className="p-5 space-y-4">
          {messages.length === 0 && !chatPending ? (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border border-border text-fg-muted hover:text-[var(--foreground)] hover:border-border-strong transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : (
            <ul className="space-y-3 max-h-[28rem] overflow-y-auto">
              {messages.map((turn, idx) => (
                <li
                  key={idx}
                  className={`rounded-[var(--radius-sm)] px-3.5 py-2.5 text-sm max-w-[85%] ${
                    turn.role === "user" ? "bg-brand-600 text-white ml-auto" : "bg-surface-muted text-[var(--foreground)]"
                  }`}
                >
                  {turn.content}
                </li>
              ))}
              {chatPending && <li className="text-sm text-fg-muted">Atlas está digitando...</li>}
            </ul>
          )}

          {chatError && <Banner tone="danger">{chatError}</Banner>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendQuestion(input);
                }
              }}
              placeholder="Pergunte algo sobre este evento..."
              rows={2}
              className="flex-1 min-h-0"
              disabled={chatPending}
            />
            <Button type="submit" disabled={chatPending || !input.trim()}>
              Enviar
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function SummaryView({ summary }: { summary: AtlasSummary }) {
  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="text-xs text-fg-muted uppercase tracking-wide mb-1">Situação</p>
        <p className="text-[var(--foreground)]">{summary.situacao}</p>
      </div>

      <SummaryList title="Próximos marcos" items={summary.proximosMarcos} />
      <SummaryList title="Pendências" items={summary.pendencias} />

      {summary.riscos.length > 0 && (
        <div>
          <p className="text-xs text-fg-muted uppercase tracking-wide mb-1.5">Riscos</p>
          <ul className="space-y-1.5">
            {summary.riscos.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Badge tone={SEVERITY_TONE[r.severidade] ?? "neutral"}>{r.severidade}</Badge>
                <span className="text-[var(--foreground)]">{r.descricao}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <SummaryField label="Orçamento" value={summary.orcamento} />
        <SummaryField label="Reservas" value={summary.reservas} />
        <SummaryField label="Equipe" value={summary.equipe} />
        <SummaryField label="Fornecedores" value={summary.fornecedores} />
        <SummaryField label="Participantes" value={summary.participantes} />
      </div>

      <SummaryList title="Recomendações" items={summary.recomendacoes} />

      {summary.encerramento && (
        <div className="pt-4 border-t border-border-subtle space-y-4">
          <p className="text-xs text-fg-muted uppercase tracking-wide">Encerramento</p>
          <SummaryList title="Concluído" items={summary.encerramento.concluido} />
          <SummaryList title="Pendências finais" items={summary.encerramento.pendenciasFinais} />
          <SummaryField label="Desvios de orçamento" value={summary.encerramento.desviosOrcamento} />
          <SummaryList title="Ocorrências" items={summary.encerramento.ocorrencias} />
          <SummaryList title="Aprendizados" items={summary.encerramento.aprendizados} />
          <SummaryList title="Recomendações para eventos futuros" items={summary.encerramento.recomendacoesFuturas} />
        </div>
      )}
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-fg-muted uppercase tracking-wide mb-1.5">{title}</p>
      <ul className="list-disc list-inside space-y-1 text-[var(--foreground)]">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-fg-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[var(--foreground)]">{value}</p>
    </div>
  );
}
