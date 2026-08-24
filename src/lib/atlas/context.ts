import "server-only";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { can } from "@/lib/domain/permissions";
import { COMPLEXITY_LEVEL_LABELS } from "@/lib/domain/complexity";
import { detectEventRisks } from "./riskEngine";
import { suggestNextActions } from "./actionEngine";
import { analyzeFinancials } from "./financialEngine";
import type { AtlasContext } from "./types";

/**
 * Atlas (Fase 3) - camada "coleta de contexto" (docs/FASE_03_ATLAS.md
 * seção 12), separada da "montagem do contexto" (prompt.ts) e da
 * "chamada ao modelo" (client.ts/chat.ts/summary.ts).
 *
 * Toda leitura passa pelo Repository normal (mock/Supabase) — a mesma
 * autorização por company_id já aplicada em toda a aplicação (princípios
 * 2/10 "respeitar company_id"/"proteger informações entre empresas").
 * Campos sensíveis (financeiro) só entram no objeto quando a sessão tem
 * a capability correspondente (princípio 3 "respeitar perfil") — nunca
 * dependemos só do prompt para escondê-los do modelo.
 *
 * Retorna null quando o evento não existe ou não pertence à empresa da
 * sessão (repository.events.get já filtra por company_id).
 */
export async function collectEventContext(
  session: AuthSession,
  eventId: string,
  repository: Repository,
): Promise<AtlasContext | null> {
  const event = await repository.events.get(session, eventId);
  if (!event) return null;

  const canViewFinancials = can(session.perfil, "view_financials");

  const [
    sessions,
    space,
    checklist,
    scheduleItems,
    teamMembers,
    eventSuppliers,
    reservations,
    documents,
    registrations,
    risks,
    notifications,
    history,
    complexity,
    budget,
    budgetItems,
    users,
  ] = await Promise.all([
    repository.events.getSessions(session, eventId),
    event.spaceId ? repository.spaces.get(session, event.spaceId) : Promise.resolve(null),
    repository.checklist.listByEvent(session, eventId),
    repository.schedule.listByEvent(session, eventId),
    repository.team.listByEvent(session, eventId),
    repository.eventSuppliers.listByEvent(session, eventId),
    repository.reservations.list(session, { eventId }),
    repository.documents.listByEvent(session, eventId, { includeArchived: true }),
    repository.registrations.listByEvent(session, eventId),
    repository.risks.listByEvent(session, eventId),
    repository.notifications.list(session),
    repository.events.getStatusHistory(session, eventId),
    repository.complexity.getLatestByEvent(session, eventId),
    canViewFinancials ? repository.budget.getByEvent(session, eventId) : Promise.resolve(null),
    canViewFinancials ? repository.budgetItems.listByEvent(session, eventId) : Promise.resolve([]),
    // Só para resolver nomes de responsável nos riscos/ações sugeridas
    // (seções 6/7) — nunca expor userId cru ao modelo.
    repository.users.list(session),
  ]);

  const nowMs = Date.now();

  const doneCount = checklist.filter((c) => c.status === "concluido").length;
  const pendentesCount = checklist.filter((c) => c.status === "pendente").length;
  const bloqueadosCount = checklist.filter((c) => c.status === "bloqueado").length;
  const atrasadosCount = checklist.filter(
    (c) => c.prazo && new Date(c.prazo).getTime() < nowMs && c.status !== "concluido" && c.status !== "cancelado",
  ).length;

  const activeSchedule = scheduleItems.filter((s) => s.status !== "cancelado");
  const scheduleConcluidas = scheduleItems.filter((s) => s.status === "concluido").length;
  const scheduleAtrasadas = activeSchedule.filter(
    (s) => new Date(s.fim).getTime() < nowMs && s.status !== "concluido",
  ).length;
  const scheduleProximas = activeSchedule.filter((s) => new Date(s.inicio).getTime() >= nowMs).length;

  const teamByStatus: Record<string, number> = {};
  for (const m of teamMembers) teamByStatus[m.status] = (teamByStatus[m.status] ?? 0) + 1;

  const supplierBySituacao: Record<string, number> = {};
  for (const es of eventSuppliers) supplierBySituacao[es.situacao] = (supplierBySituacao[es.situacao] ?? 0) + 1;

  const reservationsByStatus: Record<string, number> = {};
  for (const r of reservations) reservationsByStatus[r.status] = (reservationsByStatus[r.status] ?? 0) + 1;

  const confirmedRegistrations = registrations.filter((r) => r.status === "confirmada");
  const presentes = confirmedRegistrations.filter((r) => r.checkInAt).length;

  const activeDocuments = documents.filter((d) => d.status === "ativo");
  const archivedDocuments = documents.filter((d) => d.status === "arquivado");

  const openRisks = risks.filter((r) => r.status === "aberto" || r.status === "em_mitigacao");

  const eventNotifications = notifications.filter((n) => n.eventId === eventId);

  const sortedSessions = sessions.slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
  const primeiraSessao = sortedSessions[0];
  const ultimaSessao = sortedSessions[sortedSessions.length - 1];

  const userNameById = new Map(users.map((u) => [u.id, u.nome]));

  let financeiro: AtlasContext["financeiro"] = null;
  let financeiroDetalhado: AtlasContext["financeiroDetalhado"] = null;
  if (canViewFinancials) {
    const activeBudgetItems = budgetItems.filter((i) => i.status !== "cancelado");
    const orcamentoPrevisto = budget?.valorPrevisto ?? 0;
    const comprometido = activeBudgetItems.reduce((sum, i) => sum + (i.valorContratado ?? 0), 0);
    const realizado = activeBudgetItems.reduce((sum, i) => sum + (i.valorRealizado ?? 0), 0);
    financeiro = {
      orcamentoPrevisto,
      comprometido,
      realizado,
      saldoRealizado: orcamentoPrevisto - realizado,
      percentualExecutado: orcamentoPrevisto > 0 ? (realizado / orcamentoPrevisto) * 100 : null,
    };
    financeiroDetalhado = analyzeFinancials({ budgetItems: activeBudgetItems, orcamentoPrevisto, comprometido, realizado });
  }

  const riscosDetectados = detectEventRisks({
    evento: { status: event.status },
    nowMs,
    primeiraSessaoInicio: primeiraSessao?.inicio ?? null,
    checklist,
    scheduleItems,
    reservations,
    espacoCapacidade: space?.capacidade ?? null,
    confirmadosCount: confirmedRegistrations.length,
    eventSuppliers,
    documents,
    financeiro,
  });

  const acoesSugeridas = suggestNextActions({
    evento: { status: event.status },
    nowMs,
    checklist,
    scheduleItems,
    reservations,
    eventSuppliers,
    documents,
    financeiro,
    userNameById,
  });

  return {
    evento: {
      titulo: event.titulo,
      status: event.status,
      categoria: event.categoria,
      demandante: event.demandante,
      estrategico: event.estrategico,
      complexidade: complexity ? COMPLEXITY_LEVEL_LABELS[complexity.nivel] : null,
      localizacao: `${event.tipoLocalizacao === "interno" ? "Interno" : "Externo"} - ${space?.nome ?? event.local ?? "não definido"}`,
    },
    dataHora: primeiraSessao
      ? { inicio: primeiraSessao.inicio, fim: ultimaSessao.fim, totalSessoes: sortedSessions.length }
      : null,
    checklist: {
      total: checklist.length,
      concluidos: doneCount,
      pendentes: pendentesCount,
      bloqueados: bloqueadosCount,
      atrasados: atrasadosCount,
    },
    cronograma: {
      total: scheduleItems.length,
      concluidas: scheduleConcluidas,
      atrasadas: scheduleAtrasadas,
      proximas: scheduleProximas,
    },
    equipe: { total: teamMembers.length, porStatus: teamByStatus },
    fornecedores: { total: eventSuppliers.length, porSituacao: supplierBySituacao },
    reservas: { total: reservations.length, porStatus: reservationsByStatus },
    participantes: {
      inscritos: registrations.length,
      confirmados: confirmedRegistrations.length,
      presentes,
      ausentes: confirmedRegistrations.length - presentes,
    },
    documentos: { ativos: activeDocuments.length, arquivados: archivedDocuments.length },
    riscos: {
      total: risks.length,
      abertos: openRisks.length,
      lista: risks.slice(0, 10).map((r) => ({ titulo: r.titulo, severidade: r.severidade, status: r.status })),
    },
    pendencias: {
      total: eventNotifications.length,
      lista: eventNotifications.slice(0, 15).map((n) => ({ tipo: n.type, titulo: n.titulo, severidade: n.severity })),
    },
    financeiro,
    historicoRecente: history
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((h) => ({ de: h.statusAnterior, para: h.statusNovo, quando: h.createdAt })),
    riscosDetectados,
    acoesSugeridas,
    financeiroDetalhado,
  };
}
