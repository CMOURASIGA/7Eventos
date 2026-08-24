import type { ChecklistItem, EventDocument, EventStatus, EventSupplier, Reservation, ScheduleItem } from "@/lib/domain/types";
import type { AtlasRiskSeverity, AtlasSuggestedAction } from "./types";

/**
 * Atlas (Fase 3) - próximas ações sugeridas (docs/FASE_03_ATLAS.md seção
 * 7). Assim como riskEngine.ts, é uma função pura e determinística — as
 * sugestões vêm dos mesmos dados brutos usados pelo motor de riscos, não
 * de uma invenção do modelo. "Sugestão não deve virar tarefa
 * automaticamente sem confirmação" (regra explícita da seção 7): esta
 * função só lê dados e devolve texto, nunca grava nada.
 */

const EVENTO_EM_ANDAMENTO = new Set<EventStatus>(["confirmado", "em_execucao"]);

const PRAZO_POR_SEVERIDADE: Record<AtlasRiskSeverity, string> = {
  critica: "Imediato",
  alta: "Nos próximos 2 dias",
  media: "Esta semana",
  baixa: "Quando possível",
};

const MAX_ACTIONS = 8;
const SEVERITY_ORDER: Record<AtlasRiskSeverity, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };

export interface ActionEngineInput {
  evento: { status: EventStatus };
  nowMs: number;
  checklist: ChecklistItem[];
  scheduleItems: ScheduleItem[];
  reservations: Reservation[];
  eventSuppliers: EventSupplier[];
  documents: EventDocument[];
  financeiro: { orcamentoPrevisto: number; comprometido: number; realizado: number } | null;
  /** userId -> nome, para resolver responsável sem expor ids crus na sugestão. */
  userNameById: ReadonlyMap<string, string>;
}

export function suggestNextActions(input: ActionEngineInput): AtlasSuggestedAction[] {
  const { evento, nowMs, checklist, scheduleItems, reservations, eventSuppliers, documents, financeiro, userNameById } = input;
  const acoes: AtlasSuggestedAction[] = [];
  const eventoEmAndamento = EVENTO_EM_ANDAMENTO.has(evento.status);

  const nomeDe = (id: string | undefined): string | null => (id ? (userNameById.get(id) ?? null) : null);

  // Tarefas vencidas: uma ação por item, prazo sugerido "imediato".
  for (const c of checklist) {
    if (c.prazo && new Date(c.prazo).getTime() < nowMs && c.status !== "concluido" && c.status !== "cancelado") {
      acoes.push({
        acao: `Concluir tarefa vencida: "${c.titulo}"`,
        prioridade: "alta",
        justificativa: `Prazo era ${c.prazo.slice(0, 10)} e a tarefa ainda está "${c.status}".`,
        prazoSugerido: "Imediato",
        responsavelSugerido: nomeDe(c.responsavelId),
      });
    }
  }

  // Itens de checklist bloqueados.
  for (const c of checklist.filter((c) => c.status === "bloqueado")) {
    acoes.push({
      acao: `Desbloquear tarefa: "${c.titulo}"`,
      prioridade: "alta",
      justificativa: "Item de checklist bloqueado impede o avanço de etapas relacionadas.",
      prazoSugerido: PRAZO_POR_SEVERIDADE.alta,
      responsavelSugerido: nomeDe(c.responsavelId),
    });
  }

  // Atividades do cronograma sem responsável.
  for (const s of scheduleItems.filter((s) => !s.responsavelId && s.status !== "cancelado" && s.status !== "concluido")) {
    acoes.push({
      acao: `Definir responsável para a atividade "${s.titulo}"`,
      prioridade: "media",
      justificativa: "Atividade do cronograma sem responsável atribuído.",
      prazoSugerido: PRAZO_POR_SEVERIDADE.media,
      responsavelSugerido: null,
    });
  }

  // Reserva não confirmada.
  if (eventoEmAndamento) {
    const solicitadas = reservations.filter((r) => r.status === "solicitada");
    if (solicitadas.length > 0) {
      acoes.push({
        acao: "Confirmar reserva do espaço do evento",
        prioridade: "alta",
        justificativa: `${solicitadas.length} reserva(s) ainda em status "solicitada" para um evento já em andamento.`,
        prazoSugerido: PRAZO_POR_SEVERIDADE.alta,
        responsavelSugerido: null,
      });
    }

    // Fornecedores ainda não contratados.
    for (const s of eventSuppliers.filter((s) => s.situacao === "previsto")) {
      acoes.push({
        acao: `Avançar contratação do fornecedor: ${s.servico}`,
        prioridade: "media",
        justificativa: 'Fornecedor ainda em status "previsto" para um evento já em andamento.',
        prazoSugerido: PRAZO_POR_SEVERIDADE.media,
        responsavelSugerido: nomeDe(s.responsavelInternoId),
      });
    }
  }

  // Documento obrigatório ausente.
  if (eventoEmAndamento || evento.status === "concluido") {
    const temContrato = documents.some((d) => d.categoria === "contrato" && d.status === "ativo");
    if (!temContrato) {
      acoes.push({
        acao: "Anexar o contrato do evento na aba de documentos",
        prioridade: "media",
        justificativa: 'Nenhum documento ativo da categoria "Contrato" encontrado.',
        prazoSugerido: PRAZO_POR_SEVERIDADE.media,
        responsavelSugerido: null,
      });
    }
  }

  // Orçamento acima do previsto.
  if (financeiro && financeiro.orcamentoPrevisto > 0 && financeiro.realizado > financeiro.orcamentoPrevisto) {
    acoes.push({
      acao: "Revisar despesas realizadas do orçamento",
      prioridade: "alta",
      justificativa: `Realizado (R$ ${financeiro.realizado.toFixed(2)}) já ultrapassa o previsto (R$ ${financeiro.orcamentoPrevisto.toFixed(2)}).`,
      prazoSugerido: PRAZO_POR_SEVERIDADE.alta,
      responsavelSugerido: null,
    });
  }

  return acoes.sort((a, b) => SEVERITY_ORDER[a.prioridade] - SEVERITY_ORDER[b.prioridade]).slice(0, MAX_ACTIONS);
}
