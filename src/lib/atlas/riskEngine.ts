import type { ChecklistItem, EventDocument, EventStatus, EventSupplier, Reservation, ScheduleItem } from "@/lib/domain/types";
import type { AtlasDetectedRisk, AtlasRiskSeverity } from "./types";

/**
 * Atlas (Fase 3) - motor de riscos (docs/FASE_03_ATLAS.md seção 6).
 *
 * Função pura e determinística: nenhuma chamada ao modelo de IA, nenhuma
 * leitura direta de repositório. Recebe os dados já coletados por
 * context.ts e devolve a lista de riscos detectados — é isto, e não o
 * prompt, que decide quais riscos existem (princípio "não colocar regras
 * críticas apenas no prompt", seção 12). O modelo (chat.ts/summary.ts)
 * só recebe esta lista pronta via AtlasContext.riscosDetectados.
 *
 * Cada sinal agrega as ocorrências relacionadas num único risco (em vez
 * de um item por registro) para manter o resultado legível e o consumo
 * de tokens sob controle (seção 13).
 */

const EVENTO_EM_ANDAMENTO = new Set<EventStatus>(["confirmado", "em_execucao"]);

function truncList(items: string[], max = 3): string {
  if (items.length === 0) return "";
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} e mais ${items.length - max}`;
}

const SEVERITY_ORDER: Record<AtlasRiskSeverity, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };

export interface RiskEngineInput {
  evento: { status: EventStatus };
  nowMs: number;
  primeiraSessaoInicio: string | null;
  checklist: ChecklistItem[];
  scheduleItems: ScheduleItem[];
  reservations: Reservation[];
  espacoCapacidade: number | null;
  confirmadosCount: number;
  eventSuppliers: EventSupplier[];
  documents: EventDocument[];
  financeiro: { orcamentoPrevisto: number; comprometido: number; realizado: number } | null;
}

export function detectEventRisks(input: RiskEngineInput): AtlasDetectedRisk[] {
  const {
    evento,
    nowMs,
    primeiraSessaoInicio,
    checklist,
    scheduleItems,
    reservations,
    espacoCapacidade,
    confirmadosCount,
    eventSuppliers,
    documents,
    financeiro,
  } = input;
  const riscos: AtlasDetectedRisk[] = [];
  const eventoEmAndamento = EVENTO_EM_ANDAMENTO.has(evento.status);

  // 1. Tarefa atrasada.
  const atrasadas = checklist.filter(
    (c) => c.prazo && new Date(c.prazo).getTime() < nowMs && c.status !== "concluido" && c.status !== "cancelado",
  );
  if (atrasadas.length > 0) {
    riscos.push({
      codigo: "tarefa_atrasada",
      descricao: "Tarefas do checklist com prazo vencido",
      severidade: atrasadas.length >= 3 ? "alta" : "media",
      evidencia: `${atrasadas.length} tarefa(s) vencida(s): ${truncList(atrasadas.map((c) => c.titulo))}.`,
      impacto: "Atividades de preparação atrasadas podem comprometer a execução do evento.",
      recomendacao: "Revisar prazos e concluir ou reatribuir as tarefas vencidas.",
    });
  }

  // 2. Checklist crítico pendente (interpretado como item bloqueado: por
  // definição, um bloqueio impede o avanço de outras etapas).
  const bloqueadas = checklist.filter((c) => c.status === "bloqueado");
  if (bloqueadas.length > 0) {
    riscos.push({
      codigo: "checklist_critico_pendente",
      descricao: "Itens de checklist bloqueados",
      severidade: "alta",
      evidencia: `${bloqueadas.length} item(ns) bloqueado(s): ${truncList(bloqueadas.map((c) => c.titulo))}.`,
      impacto: "Um item bloqueado tende a travar outras etapas do planejamento.",
      recomendacao: "Identificar o impedimento e desbloquear com o responsável o quanto antes.",
    });
  }

  // 3. Reserva não confirmada, com o evento já avançando.
  if (eventoEmAndamento) {
    const solicitadas = reservations.filter((r) => r.status === "solicitada");
    if (solicitadas.length > 0) {
      riscos.push({
        codigo: "reserva_nao_confirmada",
        descricao: "Reserva de espaço ainda não confirmada",
        severidade: "alta",
        evidencia: `${solicitadas.length} reserva(s) em status "solicitada" para um evento já ${
          evento.status === "em_execucao" ? "em execução" : "confirmado"
        }.`,
        impacto: "Sem confirmação, o espaço pode não estar garantido para a data do evento.",
        recomendacao: "Confirmar a reserva do espaço com quem administra a agenda.",
      });
    }
  }

  // 4. Capacidade incompatível.
  if (espacoCapacidade !== null && espacoCapacidade > 0 && confirmadosCount > espacoCapacidade) {
    riscos.push({
      codigo: "capacidade_incompativel",
      descricao: "Participantes confirmados acima da capacidade do espaço",
      severidade: "critica",
      evidencia: `${confirmadosCount} participante(s) confirmado(s) para uma capacidade de ${espacoCapacidade}.`,
      impacto: "Risco de superlotação, desconforto e questões de segurança no dia do evento.",
      recomendacao: "Rever a lista de confirmados ou buscar um espaço com capacidade compatível.",
    });
  }

  // 5. Orçamento acima do previsto (realizado tem prioridade sobre só comprometido).
  if (financeiro && financeiro.orcamentoPrevisto > 0) {
    if (financeiro.realizado > financeiro.orcamentoPrevisto) {
      riscos.push({
        codigo: "orcamento_acima_previsto",
        descricao: "Valor realizado acima do orçamento previsto",
        severidade: "alta",
        evidencia: `Realizado R$ ${financeiro.realizado.toFixed(2)} contra previsto R$ ${financeiro.orcamentoPrevisto.toFixed(2)}.`,
        impacto: "O evento já ultrapassou o orçamento aprovado.",
        recomendacao: "Revisar as despesas realizadas e avaliar necessidade de aditivo orçamentário.",
      });
    } else if (financeiro.comprometido > financeiro.orcamentoPrevisto) {
      riscos.push({
        codigo: "orcamento_comprometido_acima_previsto",
        descricao: "Valor contratado acima do orçamento previsto",
        severidade: "media",
        evidencia: `Comprometido R$ ${financeiro.comprometido.toFixed(2)} contra previsto R$ ${financeiro.orcamentoPrevisto.toFixed(2)}.`,
        impacto: "Mesmo sem gasto realizado ainda, os contratos já superam o previsto.",
        recomendacao: "Reavaliar contratos e negociar valores antes que o gasto seja realizado.",
      });
    }
  }

  // 6. Fornecedor sem confirmação, com o evento já avançando.
  if (eventoEmAndamento) {
    const previstos = eventSuppliers.filter((s) => s.situacao === "previsto");
    if (previstos.length > 0) {
      riscos.push({
        codigo: "fornecedor_sem_confirmacao",
        descricao: "Fornecedor ainda não contratado",
        severidade: "media",
        evidencia: `${previstos.length} fornecedor(es) em status "previsto": ${truncList(previstos.map((s) => s.servico))}.`,
        impacto: "Um serviço essencial pode não estar garantido para a data do evento.",
        recomendacao: "Avançar a contratação ou confirmar os fornecedores pendentes.",
      });
    }
  }

  // 7. Documento obrigatório ausente (contrato, quando o evento já está confirmado ou depois).
  if (eventoEmAndamento || evento.status === "concluido") {
    const temContrato = documents.some((d) => d.categoria === "contrato" && d.status === "ativo");
    if (!temContrato) {
      riscos.push({
        codigo: "documento_obrigatorio_ausente",
        descricao: "Contrato do evento não registrado",
        severidade: "media",
        evidencia: 'Nenhum documento ativo da categoria "Contrato" encontrado para este evento.',
        impacto: "Falta de respaldo contratual para um evento já confirmado.",
        recomendacao: "Anexar o contrato correspondente na aba de documentos do evento.",
      });
    }
  }

  // 8. Atividade sem responsável.
  const semResponsavel = scheduleItems.filter(
    (s) => !s.responsavelId && s.status !== "cancelado" && s.status !== "concluido",
  );
  if (semResponsavel.length > 0) {
    riscos.push({
      codigo: "atividade_sem_responsavel",
      descricao: "Atividades do cronograma sem responsável definido",
      severidade: "media",
      evidencia: `${semResponsavel.length} atividade(s) sem responsável: ${truncList(semResponsavel.map((s) => s.titulo))}.`,
      impacto: "Sem um responsável claro, a execução da atividade pode falhar.",
      recomendacao: "Atribuir um responsável a cada atividade do cronograma.",
    });
  }

  // 9. Prazo muito próximo, com pendências ainda em aberto.
  if (primeiraSessaoInicio) {
    const horasAte = (new Date(primeiraSessaoInicio).getTime() - nowMs) / 3_600_000;
    if (horasAte >= 0 && horasAte <= 72) {
      const pendentes = checklist.filter((c) => c.status === "pendente" || c.status === "bloqueado").length;
      if (pendentes > 0) {
        riscos.push({
          codigo: "prazo_muito_proximo",
          descricao: "Evento próximo com pendências em aberto",
          severidade: "critica",
          evidencia: `Evento começa em menos de ${Math.max(1, Math.round(horasAte))}h, com ${pendentes} item(ns) de checklist pendente(s)/bloqueado(s).`,
          impacto: "Pouco tempo hábil para resolver as pendências antes da execução.",
          recomendacao: "Priorizar as pendências restantes com urgência ou escalar para a liderança.",
        });
      }
    }
  }

  // 10. Conflito de agenda: mesmo responsável em duas atividades sobrepostas.
  const comResponsavel = scheduleItems.filter((s) => s.responsavelId && s.status !== "cancelado");
  const porResponsavel = new Map<string, ScheduleItem[]>();
  for (const s of comResponsavel) {
    const lista = porResponsavel.get(s.responsavelId as string) ?? [];
    lista.push(s);
    porResponsavel.set(s.responsavelId as string, lista);
  }
  const conflitos: string[] = [];
  for (const lista of porResponsavel.values()) {
    const ordenada = lista.slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < ordenada.length; i++) {
      if (new Date(ordenada[i].inicio).getTime() < new Date(ordenada[i - 1].fim).getTime()) {
        conflitos.push(`${ordenada[i - 1].titulo} × ${ordenada[i].titulo}`);
      }
    }
  }
  if (conflitos.length > 0) {
    riscos.push({
      codigo: "conflito_agenda",
      descricao: "Conflito de agenda entre atividades do cronograma",
      severidade: "alta",
      evidencia: `${conflitos.length} sobreposição(ões) de horário para o mesmo responsável: ${truncList(conflitos)}.`,
      impacto: "O mesmo responsável não pode estar em duas atividades ao mesmo tempo.",
      recomendacao: "Ajustar os horários ou redistribuir a responsabilidade entre as atividades.",
    });
  }

  return riscos.sort((a, b) => SEVERITY_ORDER[a.severidade] - SEVERITY_ORDER[b.severidade]);
}
