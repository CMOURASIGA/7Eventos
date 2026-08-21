import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import {
  EVENT_STATUS_LABELS,
  CHECKLIST_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  EVENT_SUPPLIER_SITUACAO_LABELS,
  TEAM_MEMBER_STATUS_LABELS,
  SCHEDULE_ITEM_STATUS_LABELS,
  SCHEDULE_ITEM_PRIORITY_LABELS,
  EVENT_DOCUMENT_CATEGORY_LABELS,
  REGISTRATION_STATUS_LABELS,
  BUDGET_ITEM_STATUS_LABELS,
  type EventStatus,
  type ScheduleItem,
} from "@/lib/domain/types";
import {
  COMPLEXITY_LEVEL_LABELS,
  EFFORT_FACTOR_KEYS,
  IMPACT_FACTOR_KEYS,
  FACTOR_LABELS,
  defaultComplexityFactors,
  calculateComplexity,
} from "@/lib/domain/complexity";
import { CATEGORIAS_ORCAMENTO } from "@/lib/domain/catalog";
import { Card, Badge, Banner, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { changeEventStatus, cancelEvent, addEventSession } from "../actions";
import { addChecklistItem, removeChecklistItem } from "../checklist-actions";
import { ChecklistStatusSelect } from "../ChecklistStatusSelect";
import { saveBudget } from "../budget-actions";
import { assessComplexity } from "../complexity-actions";
import { linkSupplierToEvent, removeEventSupplier, updateEventSupplierValues } from "../supplier-actions";
import { EventSupplierSituacaoSelect } from "../EventSupplierSituacaoSelect";
import { addTeamMember, removeTeamMember } from "../team-actions";
import { TeamMemberStatusSelect } from "../TeamMemberStatusSelect";
import { addScheduleItem, removeScheduleItem } from "../schedule-actions";
import { ScheduleItemStatusSelect } from "../ScheduleItemStatusSelect";
import { addDocument, archiveDocument, restoreDocument } from "../document-actions";
import { addRegistration, checkInRegistration, undoCheckInRegistration, removeRegistration } from "../registration-actions";
import { RegistrationStatusSelect } from "../RegistrationStatusSelect";
import { addBudgetItem, updateBudgetItemValues, removeBudgetItem } from "../budget-item-actions";
import { BudgetItemStatusSelect } from "../BudgetItemStatusSelect";

const STATUS_FLOW: EventStatus[] = [
  "rascunho",
  "planejamento",
  "aguardando_aprovacao",
  "confirmado",
  "em_execucao",
  "concluido",
];

const TAB_KEYS = [
  "visao-geral",
  "sessoes",
  "reservas",
  "checklist",
  "fornecedores",
  "equipe",
  "cronograma",
  "documentos",
  "participantes",
  "orcamento",
  "complexidade",
  "historico",
] as const;
const SCHEDULE_FILTERS = ["todas", "atrasadas", "proximas", "concluidas"] as const;
type ScheduleFilter = (typeof SCHEDULE_FILTERS)[number];
type TabKey = (typeof TAB_KEYS)[number];

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    updated?: string;
    reservationCreated?: string;
    created?: string;
    tab?: string;
    negado?: string;
    cronogramaFiltro?: string;
    documentosArquivados?: string;
    participantesBusca?: string;
  }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;
  const { error, updated, reservationCreated, created, tab, negado, cronogramaFiltro, documentosArquivados, participantesBusca } =
    await searchParams;
  const canViewFinancials = can(session.perfil, "view_financials");
  const requestedTab = (TAB_KEYS as readonly string[]).includes(tab ?? "") ? (tab as TabKey) : "visao-geral";
  // A aba de orçamento expõe valores financeiros — quem não tem
  // "view_financials" cai de volta para a visão geral, mesmo digitando
  // ?tab=orcamento diretamente na URL.
  const activeTab: TabKey = requestedTab === "orcamento" && !canViewFinancials ? "visao-geral" : requestedTab;
  const scheduleFilter: ScheduleFilter = (SCHEDULE_FILTERS as readonly string[]).includes(cronogramaFiltro ?? "")
    ? (cronogramaFiltro as ScheduleFilter)
    : "todas";
  const showArchivedDocuments = documentosArquivados === "1";

  const event = await repository.events.get(session, id);
  if (!event) notFound();

  const [
    sessions,
    reservations,
    checklist,
    budget,
    complexity,
    history,
    users,
    space,
    eventSuppliers,
    teamMembers,
    supplierCatalog,
    scheduleItems,
    documents,
    registrations,
    participantCatalog,
    budgetItems,
  ] = await Promise.all([
    repository.events.getSessions(session, id),
    repository.reservations.list(session, { eventId: id }),
    repository.checklist.listByEvent(session, id),
    repository.budget.getByEvent(session, id),
    repository.complexity.getLatestByEvent(session, id),
    repository.events.getStatusHistory(session, id),
    repository.users.list(session),
    event.spaceId ? repository.spaces.get(session, event.spaceId) : Promise.resolve(null),
    repository.eventSuppliers.listByEvent(session, id),
    repository.team.listByEvent(session, id),
    repository.suppliers.list(session, { status: "ativo" }),
    repository.schedule.listByEvent(session, id),
    repository.documents.listByEvent(session, id, { includeArchived: true }),
    repository.registrations.listByEvent(session, id),
    repository.participants.list(session, { status: "ativo" }),
    repository.budgetItems.listByEvent(session, id),
  ]);
  const spaceById = new Map((await repository.spaces.list(session)).map((s) => [s.id, s]));

  const userById = new Map(users.map((u) => [u.id, u]));
  const supplierById = new Map(supplierCatalog.map((s) => [s.id, s]));
  const canEdit = can(session.perfil, "create_edit_event");
  const canChecklist = can(session.perfil, "manage_checklist");
  const canBudget = can(session.perfil, "manage_budget");
  const canComplexity = can(session.perfil, "assess_complexity");
  const canCancel = can(session.perfil, "cancel_delete_event");
  const canManageReservations = can(session.perfil, "manage_reservations");
  const canManageSuppliers = can(session.perfil, "manage_suppliers");
  const canManageTeam = can(session.perfil, "manage_team");
  const canManageSchedule = can(session.perfil, "manage_schedule");
  const canManageDocuments = can(session.perfil, "manage_documents");
  const canManageRegistrations = can(session.perfil, "manage_registrations");
  const teamMemberIds = new Set(teamMembers.map((m) => m.userId));
  const availableUsersForTeam = users.filter((u) => !teamMemberIds.has(u.id));
  // Operador (só "create_event"): pode continuar o próprio rascunho pelo
  // assistente, mas não tem "Editar"/"Avançar status" (exclusivos do Gestor/Admin).
  const canContinueOwnDraft =
    !canEdit && can(session.perfil, "create_event") && event.createdBy === session.userId && event.status === "rascunho";

  const doneCount = checklist.filter((c) => c.status === "concluido").length;
  const checklistPct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  // Cronograma: "atrasada"/"próxima" são derivadas de inicio/fim + status
  // atual, não persistidas (docs/FASE_02_GESTAO.md seção 4).
  const scheduleById = new Map(scheduleItems.map((i) => [i.id, i]));
  const nowMs = new Date().getTime();
  const isOverdue = (item: ScheduleItem) =>
    new Date(item.fim).getTime() < nowMs && item.status !== "concluido" && item.status !== "cancelado";
  const isUpcoming = (item: ScheduleItem) => new Date(item.inicio).getTime() >= nowMs && item.status !== "cancelado";
  const overdueSchedule = scheduleItems.filter(isOverdue);
  const upcomingSchedule = scheduleItems.filter(isUpcoming).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const doneSchedule = scheduleItems.filter((i) => i.status === "concluido");
  const visibleSchedule =
    scheduleFilter === "atrasadas"
      ? overdueSchedule
      : scheduleFilter === "proximas"
        ? upcomingSchedule
        : scheduleFilter === "concluidas"
          ? doneSchedule
          : scheduleItems;
  // Linha do tempo (docs/FASE_02_GESTAO.md seção 4): barras proporcionais
  // dentro do intervalo [início mais cedo, fim mais tarde] de todas as
  // atividades do evento — só faz sentido mostrar com mais de uma.
  const timelineStart = scheduleItems.length > 0 ? Math.min(...scheduleItems.map((i) => new Date(i.inicio).getTime())) : 0;
  const timelineEnd = scheduleItems.length > 0 ? Math.max(...scheduleItems.map((i) => new Date(i.fim).getTime())) : 0;
  const timelineSpan = Math.max(timelineEnd - timelineStart, 1);

  const visibleDocuments = showArchivedDocuments ? documents : documents.filter((d) => d.status === "ativo");
  const archivedDocumentsCount = documents.filter((d) => d.status === "arquivado").length;

  // Inscrição + Credenciamento: "indicadores em tempo real" (seção 8) são
  // uma contagem simples sobre as próprias inscrições — presente = já fez
  // check-in; ausente = confirmado mas ainda sem check-in.
  const participantById = new Map(participantCatalog.map((p) => [p.id, p]));
  const registeredParticipantIds = new Set(registrations.map((r) => r.participantId));
  const availableParticipants = participantCatalog.filter((p) => !registeredParticipantIds.has(p.id));
  const confirmedRegistrations = registrations.filter((r) => r.status === "confirmada");
  const presentesCount = confirmedRegistrations.filter((r) => r.checkInAt).length;
  const ausentesCount = confirmedRegistrations.length - presentesCount;
  const registrationSearch = (participantesBusca ?? "").trim().toLowerCase();
  const visibleRegistrations = registrationSearch
    ? registrations.filter((r) => (participantById.get(r.participantId)?.nome ?? "").toLowerCase().includes(registrationSearch))
    : registrations;

  // Financeiro detalhado (docs/FASE_02_GESTAO.md seção 9): indicadores
  // sempre derivados dos itens na hora — nunca persistidos, para nunca
  // ficarem desatualizados em relação aos valores lançados.
  const activeBudgetItems = budgetItems.filter((i) => i.status !== "cancelado");
  const orcamentoTotal = budget?.valorPrevisto ?? 0;
  const comprometido = activeBudgetItems.reduce((sum, i) => sum + (i.valorContratado ?? i.valorCotado ?? 0), 0);
  const realizado = activeBudgetItems.reduce((sum, i) => sum + (i.valorRealizado ?? 0), 0);
  const saldo = orcamentoTotal - comprometido;
  const variacaoRealizado = realizado - orcamentoTotal;
  const custoPorCategoria = new Map<string, number>();
  for (const item of activeBudgetItems) {
    const valor = item.valorRealizado ?? item.valorContratado ?? item.valorCotado ?? 0;
    custoPorCategoria.set(item.categoria, (custoPorCategoria.get(item.categoria) ?? 0) + valor);
  }
  const custoPorParticipante = confirmedRegistrations.length > 0 ? (realizado || comprometido) / confirmedRegistrations.length : null;

  const factors = complexity?.fatores ?? defaultComplexityFactors();
  const preview = calculateComplexity(factors);

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(event.status) + 1];

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        breadcrumb={[{ label: "Eventos", href: "/eventos" }, { label: event.titulo }]}
        backHref="/eventos"
        backLabel="Voltar para eventos"
        title={
          <span className="flex items-center gap-2 flex-wrap">
            {event.titulo}
            <Badge tone="brand">{EVENT_STATUS_LABELS[event.status]}</Badge>
            {event.estrategico && <Badge tone="warning">Estratégico</Badge>}
          </span>
        }
        description={`${event.demandante} · ${event.categoria}${event.tematica ? ` · ${event.tematica}` : ""}`}
        actions={
          <>
            {canEdit && (
              <ButtonLink href={`/eventos/${id}/editar`} variant="secondary" size="sm">
                Editar
              </ButtonLink>
            )}
            {canContinueOwnDraft && (
              <ButtonLink href={`/eventos/${id}/novo?step=1`} variant="secondary" size="sm">
                Continuar cadastro
              </ButtonLink>
            )}
            {canEdit && nextStatus && (
              <form action={changeEventStatus.bind(null, id, nextStatus)}>
                <Button type="submit" size="sm">
                  Avançar para {EVENT_STATUS_LABELS[nextStatus]}
                </Button>
              </form>
            )}
            {canCancel && event.status !== "cancelado" && event.status !== "concluido" && (
              <ConfirmButton
                size="sm"
                title="Cancelar evento"
                description={`O evento "${event.titulo}" será marcado como cancelado. O histórico é preservado e a ação pode ser revertida avançando o status novamente.`}
                confirmLabel="Cancelar evento"
                aria-label={`Cancelar evento ${event.titulo}`}
                onConfirm={cancelEvent.bind(null, id)}
              >
                Cancelar evento
              </ConfirmButton>
            )}
          </>
        }
      />

      {error && <Banner tone="danger">{error}</Banner>}
      {negado === "1" && <Banner tone="warning">Você não tem permissão para acessar essa funcionalidade.</Banner>}
      {updated === "1" && <Banner tone="success">Evento atualizado com sucesso.</Banner>}
      {created === "1" && event.status === "rascunho" && (
        <Banner tone="success">
          Evento salvo em rascunho. Um gestor precisa revisar e avançar o status para seguir com o planejamento.
        </Banner>
      )}
      {created === "1" && event.status !== "rascunho" && <Banner tone="success">Evento criado com sucesso.</Banner>}
      {reservationCreated === "1" && <Banner tone="success">Reserva criada e vinculada a este evento.</Banner>}

      <Card className="overflow-hidden">
        <Tabs
          basePath={`/eventos/${id}`}
          active={activeTab}
          items={[
            { key: "visao-geral", label: "Visão geral" },
            { key: "sessoes", label: "Sessões", count: sessions.length },
            { key: "reservas", label: "Reservas", count: reservations.length },
            { key: "checklist", label: "Checklist", count: checklist.length },
            { key: "fornecedores", label: "Fornecedores", count: eventSuppliers.length },
            { key: "equipe", label: "Equipe", count: teamMembers.length },
            { key: "cronograma", label: "Cronograma", count: scheduleItems.length },
            { key: "documentos", label: "Documentos", count: visibleDocuments.length },
            { key: "participantes", label: "Participantes", count: registrations.length },
            ...(canViewFinancials ? [{ key: "orcamento", label: "Orçamento" }] : []),
            { key: "complexidade", label: "Complexidade" },
            { key: "historico", label: "Histórico", count: history.length },
          ]}
        />

        <div className="p-5">
          {activeTab === "visao-geral" && (
            <div className="space-y-5">
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <Info label="Responsável" value={userById.get(event.responsavelId)?.nome ?? "—"} />
                <Info label="Contato do demandante" value={event.contatoDemandante ?? "—"} />
                <Info
                  label="Localização"
                  value={`${event.tipoLocalizacao === "interno" ? "Interno" : "Externo"} · ${space?.nome ?? event.local ?? "—"}`}
                />
                <Info label="Formato" value={event.formato ?? "—"} />
                <Info label="Escopo" value={event.escopo ?? "—"} />
                <Info label="Segmento" value={event.segmento ?? "—"} />
                <Info label="Classificação" value={event.classificacao ?? "—"} />
                <Info label="Público-alvo" value={event.publicoAlvo ?? "—"} />
                <Info label="Restrito" value={event.restrito ? "Sim" : "Não"} />
                <Info label="Previsto em orçamento" value={event.previstoOrcamento ? "Sim" : "Não"} />
              </dl>
              {event.descricao && <p className="text-sm text-fg-muted">{event.descricao}</p>}
              {event.detalhesPlanejamento && (
                <div>
                  <p className="text-xs text-fg-muted uppercase tracking-wide mb-1">Planejamento</p>
                  <p className="text-sm text-[var(--foreground)]">{event.detalhesPlanejamento}</p>
                </div>
              )}
              {event.jornadaParticipante && (
                <div>
                  <p className="text-xs text-fg-muted uppercase tracking-wide mb-1">Jornada do participante</p>
                  <p className="text-sm text-[var(--foreground)]">{event.jornadaParticipante}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "sessoes" && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <EmptyState title="Nenhuma sessão cadastrada." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {sessions.map((s) => (
                    <li key={s.id} className="px-5 py-3 text-sm flex items-center justify-between">
                      <span>
                        {formatDateTime(s.inicio)} até {formatDateTime(s.fim)}
                      </span>
                      {s.observacao && <span className="text-xs text-fg-muted">{s.observacao}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && (
                <form
                  action={addEventSession.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-3 gap-3 items-end"
                >
                  <Field label="Início" htmlFor="s-inicio">
                    <Input id="s-inicio" name="inicio" type="datetime-local" required />
                  </Field>
                  <Field label="Fim" htmlFor="s-fim">
                    <Input id="s-fim" name="fim" type="datetime-local" required />
                  </Field>
                  <Button type="submit" variant="secondary" size="sm">
                    Adicionar sessão
                  </Button>
                </form>
              )}
            </div>
          )}

          {activeTab === "reservas" && (
            <div className="space-y-4">
              {canManageReservations && (
                <div className="flex justify-end">
                  <Link href={`/reservas/nova?eventId=${id}`} className="text-sm text-brand-700 font-medium hover:underline">
                    Nova reserva
                  </Link>
                </div>
              )}
              {reservations.length === 0 ? (
                <EmptyState title="Nenhuma reserva vinculada a este evento." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {reservations.map((r) => (
                    <li key={r.id} className="px-5 py-3 flex items-center justify-between text-sm gap-3 flex-wrap">
                      <Link href={`/reservas/${r.id}`} className="hover:text-brand-700 hover:underline">
                        {spaceById.get(r.spaceId)?.nome ?? "Espaço"} · {formatDateTime(r.inicio)} até {formatDateTime(r.fim)} — {r.motivo}
                      </Link>
                      <Badge tone={r.status === "confirmada" ? "success" : r.status === "cancelada" ? "danger" : "warning"}>
                        {RESERVATION_STATUS_LABELS[r.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === "checklist" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-fg-muted">
                    {doneCount}/{checklist.length} concluídos
                  </span>
                  <span className="text-fg-muted">{checklistPct}%</span>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success-500 rounded-full" style={{ width: `${checklistPct}%` }} />
                </div>
              </div>
              {checklist.length === 0 ? (
                <EmptyState title="Nenhum item de checklist cadastrado." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {checklist.map((item) => (
                    <li key={item.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{item.titulo}</p>
                        <p className="text-xs text-fg-muted">
                          {item.categoria} {item.responsavelId ? `· ${userById.get(item.responsavelId)?.nome ?? ""}` : ""}
                        </p>
                      </div>
                      {canChecklist ? (
                        <div className="flex items-center gap-2">
                          <ChecklistStatusSelect eventId={id} itemId={item.id} current={item.status} />
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            title="Remover item do checklist"
                            description={`O item "${item.titulo}" será removido permanentemente do checklist deste evento.`}
                            confirmLabel="Remover"
                            aria-label={`Remover item ${item.titulo}`}
                            className="!px-2 !py-1 !text-danger-700"
                            onConfirm={removeChecklistItem.bind(null, id, item.id)}
                          >
                            Remover
                          </ConfirmButton>
                        </div>
                      ) : (
                        <Badge tone={item.status === "concluido" ? "success" : "neutral"}>
                          {CHECKLIST_STATUS_LABELS[item.status]}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canChecklist && (
                <form
                  action={addChecklistItem.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                >
                  <Field label="Novo item" htmlFor="c-titulo">
                    <Input id="c-titulo" name="titulo" required placeholder="Ex: Confirmar fornecedor de catering" />
                  </Field>
                  <Field label="Categoria" htmlFor="c-categoria">
                    <Input id="c-categoria" name="categoria" placeholder="Logística, Comunicação..." />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Adicionar item
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "fornecedores" && (
            <div className="space-y-4">
              {eventSuppliers.length === 0 ? (
                <EmptyState title="Nenhum fornecedor vinculado a este evento." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {eventSuppliers.map((link) => {
                    const supplier = supplierById.get(link.supplierId);
                    return (
                      <li key={link.id} className="px-5 py-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{supplier?.nome ?? "Fornecedor"}</p>
                            <p className="text-xs text-fg-muted">
                              {link.servico}
                              {link.responsavelInternoId ? ` · Responsável: ${userById.get(link.responsavelInternoId)?.nome ?? ""}` : ""}
                            </p>
                            {canViewFinancials && (link.valorPrevisto != null || link.valorContratado != null) && (
                              <p className="text-xs text-fg-muted">
                                {link.valorPrevisto != null && `Previsto: ${formatCurrency(link.valorPrevisto)}`}
                                {link.valorContratado != null && ` · Contratado: ${formatCurrency(link.valorContratado)}`}
                              </p>
                            )}
                          </div>
                          {canManageSuppliers ? (
                            <div className="flex items-center gap-2">
                              <EventSupplierSituacaoSelect eventId={id} linkId={link.id} current={link.situacao} />
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                title="Remover fornecedor do evento"
                                description={`O vínculo com "${supplier?.nome ?? "este fornecedor"}" será removido deste evento. O cadastro do fornecedor no catálogo não é afetado.`}
                                confirmLabel="Remover"
                                aria-label={`Remover fornecedor ${supplier?.nome ?? ""} deste evento`}
                                className="!px-2 !py-1 !text-danger-700"
                                onConfirm={removeEventSupplier.bind(null, id, link.id)}
                              >
                                Remover
                              </ConfirmButton>
                            </div>
                          ) : (
                            <Badge tone="brand">{EVENT_SUPPLIER_SITUACAO_LABELS[link.situacao]}</Badge>
                          )}
                        </div>
                        {canManageSuppliers && canViewFinancials && (
                          <form
                            action={updateEventSupplierValues.bind(null, id, link.id)}
                            className="flex flex-wrap items-end gap-2"
                          >
                            <Field label="Valor previsto (R$)" htmlFor={`vp-${link.id}`}>
                              <Input id={`vp-${link.id}`} name="valorPrevisto" type="number" min={0} step="0.01" defaultValue={link.valorPrevisto ?? ""} className="!py-1 !text-xs" />
                            </Field>
                            <Field label="Valor contratado (R$)" htmlFor={`vc-${link.id}`}>
                              <Input id={`vc-${link.id}`} name="valorContratado" type="number" min={0} step="0.01" defaultValue={link.valorContratado ?? ""} className="!py-1 !text-xs" />
                            </Field>
                            <Button type="submit" variant="ghost" size="sm">
                              Salvar valores
                            </Button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {canManageSuppliers && (
                <form
                  action={linkSupplierToEvent.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                >
                  <Field label="Fornecedor" htmlFor="f-supplierId">
                    <Select id="f-supplierId" name="supplierId" required defaultValue="">
                      <option value="" disabled>
                        Selecione
                      </option>
                      {supplierCatalog.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} — {s.categoria}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Serviço" htmlFor="f-servico">
                    <Input id="f-servico" name="servico" required placeholder="Ex: Som e iluminação do salão principal" />
                  </Field>
                  <Field label="Responsável interno" htmlFor="f-responsavelInternoId">
                    <Select id="f-responsavelInternoId" name="responsavelInternoId" defaultValue="">
                      <option value="">Nenhum</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {canViewFinancials && (
                    <>
                      <Field label="Valor previsto (R$)" htmlFor="f-valorPrevisto">
                        <Input id="f-valorPrevisto" name="valorPrevisto" type="number" min={0} step="0.01" />
                      </Field>
                      <Field label="Valor contratado (R$)" htmlFor="f-valorContratado" hint="Opcional — preencha quando já houver contratação fechada">
                        <Input id="f-valorContratado" name="valorContratado" type="number" min={0} step="0.01" />
                      </Field>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Vincular fornecedor
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "equipe" && (
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <EmptyState title="Nenhum membro de equipe alocado a este evento." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {teamMembers.map((member) => (
                    <li key={member.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{userById.get(member.userId)?.nome ?? "Usuário"}</p>
                        <p className="text-xs text-fg-muted">
                          {member.funcao}
                          {member.escala ? ` · ${member.escala}` : ""}
                        </p>
                        {member.responsabilidade && (
                          <p className="text-xs text-fg-muted mt-0.5">{member.responsabilidade}</p>
                        )}
                      </div>
                      {canManageTeam ? (
                        <div className="flex items-center gap-2">
                          <TeamMemberStatusSelect eventId={id} memberId={member.id} current={member.status} />
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            title="Remover da equipe do evento"
                            description={`${userById.get(member.userId)?.nome ?? "Este usuário"} será removido da equipe deste evento.`}
                            confirmLabel="Remover"
                            aria-label={`Remover ${userById.get(member.userId)?.nome ?? ""} da equipe do evento`}
                            className="!px-2 !py-1 !text-danger-700"
                            onConfirm={removeTeamMember.bind(null, id, member.id)}
                          >
                            Remover
                          </ConfirmButton>
                        </div>
                      ) : (
                        <Badge tone={member.status === "concluido" ? "success" : "neutral"}>{TEAM_MEMBER_STATUS_LABELS[member.status]}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canManageTeam && (
                <form
                  action={addTeamMember.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                >
                  <Field label="Usuário" htmlFor="t-userId">
                    <Select id="t-userId" name="userId" required defaultValue="">
                      <option value="" disabled>
                        Selecione
                      </option>
                      {availableUsersForTeam.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Função" htmlFor="t-funcao">
                    <Input id="t-funcao" name="funcao" required placeholder="Ex: Coordenação geral" />
                  </Field>
                  <Field label="Escala/horário" htmlFor="t-escala">
                    <Input id="t-escala" name="escala" placeholder="Ex: 8h às 18h" />
                  </Field>
                  <Field label="Responsabilidade" htmlFor="t-responsabilidade">
                    <Input id="t-responsabilidade" name="responsabilidade" placeholder="Opcional" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Adicionar membro
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "cronograma" && (
            <div className="space-y-4">
              {scheduleItems.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-fg-muted uppercase tracking-wide">Linha do tempo</p>
                  <div className="relative h-8 bg-surface-muted rounded-[var(--radius-sm)] overflow-hidden">
                    {scheduleItems.map((item) => {
                      const left = ((new Date(item.inicio).getTime() - timelineStart) / timelineSpan) * 100;
                      const width = Math.max(
                        ((new Date(item.fim).getTime() - new Date(item.inicio).getTime()) / timelineSpan) * 100,
                        1,
                      );
                      const tone =
                        item.status === "concluido"
                          ? "bg-success-500"
                          : item.status === "cancelado"
                            ? "bg-fg-muted"
                            : isOverdue(item)
                              ? "bg-danger-500"
                              : "bg-brand-600";
                      return (
                        <div
                          key={item.id}
                          title={`${item.titulo} · ${formatDateTime(item.inicio)} até ${formatDateTime(item.fim)}`}
                          className={`absolute top-1 h-6 rounded-[var(--radius-sm)] ${tone} opacity-80`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["todas", `Todas (${scheduleItems.length})`],
                    ["atrasadas", `Atrasadas (${overdueSchedule.length})`],
                    ["proximas", `Próximas (${upcomingSchedule.length})`],
                    ["concluidas", `Concluídas (${doneSchedule.length})`],
                  ] as [ScheduleFilter, string][]
                ).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/eventos/${id}?tab=cronograma${key === "todas" ? "" : `&cronogramaFiltro=${key}`}`}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      scheduleFilter === key
                        ? "bg-brand-600 border-brand-600 text-white"
                        : "border-border text-fg-muted hover:text-[var(--foreground)] hover:border-border-strong"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {visibleSchedule.length === 0 ? (
                <EmptyState title="Nenhuma atividade encontrada para este filtro." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {visibleSchedule
                    .slice()
                    .sort((a, b) => a.inicio.localeCompare(b.inicio))
                    .map((item) => {
                      const dependency = item.dependeDeId ? scheduleById.get(item.dependeDeId) : undefined;
                      return (
                        <li key={item.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                          <div>
                            <p className="font-medium text-[var(--foreground)] flex items-center gap-2 flex-wrap">
                              {item.titulo}
                              {isOverdue(item) && <Badge tone="danger">Atrasada</Badge>}
                              <Badge tone={item.prioridade === "alta" ? "warning" : "neutral"}>
                                {SCHEDULE_ITEM_PRIORITY_LABELS[item.prioridade]}
                              </Badge>
                            </p>
                            <p className="text-xs text-fg-muted">
                              {formatDateTime(item.inicio)} até {formatDateTime(item.fim)}
                              {item.responsavelId ? ` · Responsável: ${userById.get(item.responsavelId)?.nome ?? ""}` : ""}
                            </p>
                            {dependency && <p className="text-xs text-fg-muted mt-0.5">Depende de: {dependency.titulo}</p>}
                            {item.descricao && <p className="text-xs text-fg-muted mt-0.5">{item.descricao}</p>}
                          </div>
                          {canManageSchedule ? (
                            <div className="flex items-center gap-2">
                              <ScheduleItemStatusSelect eventId={id} itemId={item.id} current={item.status} />
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                title="Remover atividade do cronograma"
                                description={`A atividade "${item.titulo}" será removida permanentemente do cronograma deste evento.`}
                                confirmLabel="Remover"
                                aria-label={`Remover atividade ${item.titulo}`}
                                className="!px-2 !py-1 !text-danger-700"
                                onConfirm={removeScheduleItem.bind(null, id, item.id)}
                              >
                                Remover
                              </ConfirmButton>
                            </div>
                          ) : (
                            <Badge tone={item.status === "concluido" ? "success" : "neutral"}>
                              {SCHEDULE_ITEM_STATUS_LABELS[item.status]}
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}

              {canManageSchedule && (
                <form
                  action={addScheduleItem.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                >
                  <Field label="Título" htmlFor="sc-titulo">
                    <Input id="sc-titulo" name="titulo" required placeholder="Ex: Montagem de estrutura" />
                  </Field>
                  <Field label="Prioridade" htmlFor="sc-prioridade">
                    <Select id="sc-prioridade" name="prioridade" defaultValue="media">
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </Select>
                  </Field>
                  <Field label="Início" htmlFor="sc-inicio">
                    <Input id="sc-inicio" name="inicio" type="datetime-local" required />
                  </Field>
                  <Field label="Fim" htmlFor="sc-fim">
                    <Input id="sc-fim" name="fim" type="datetime-local" required />
                  </Field>
                  <Field label="Responsável" htmlFor="sc-responsavelId">
                    <Select id="sc-responsavelId" name="responsavelId" defaultValue="">
                      <option value="">Nenhum</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Depende de" htmlFor="sc-dependeDeId" hint="Opcional — outra atividade deste evento">
                    <Select id="sc-dependeDeId" name="dependeDeId" defaultValue="">
                      <option value="">Nenhuma</option>
                      {scheduleItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.titulo}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Observação" htmlFor="sc-observacao">
                      <Input id="sc-observacao" name="observacao" placeholder="Opcional" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Adicionar atividade
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "documentos" && (
            <div className="space-y-4">
              {archivedDocumentsCount > 0 && (
                <div className="flex justify-end">
                  <Link
                    href={`/eventos/${id}?tab=documentos${showArchivedDocuments ? "" : "&documentosArquivados=1"}`}
                    className="text-xs text-brand-700 font-medium hover:underline"
                  >
                    {showArchivedDocuments ? "Ocultar arquivados" : `Ver arquivados (${archivedDocumentsCount})`}
                  </Link>
                </div>
              )}
              {visibleDocuments.length === 0 ? (
                <EmptyState title="Nenhum documento registrado para este evento." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {visibleDocuments.map((doc) => (
                    <li key={doc.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                      <div>
                        <p className="font-medium text-[var(--foreground)] flex items-center gap-2 flex-wrap">
                          {doc.urlReferencia ? (
                            <a href={doc.urlReferencia} target="_blank" rel="noreferrer" className="hover:underline hover:text-brand-700">
                              {doc.titulo}
                            </a>
                          ) : (
                            doc.titulo
                          )}
                          <Badge tone="neutral">{EVENT_DOCUMENT_CATEGORY_LABELS[doc.categoria]}</Badge>
                          {doc.status === "arquivado" && <Badge tone="warning">Arquivado</Badge>}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {userById.get(doc.responsavelId)?.nome ?? "—"} · {formatDateTime(doc.createdAt)}
                          {doc.nomeArquivo ? ` · ${doc.nomeArquivo}` : ""}
                        </p>
                        {doc.descricao && <p className="text-xs text-fg-muted mt-0.5">{doc.descricao}</p>}
                      </div>
                      {canManageDocuments && (
                        <div className="flex items-center gap-2">
                          {doc.status === "ativo" ? (
                            <ConfirmButton
                              size="sm"
                              variant="ghost"
                              title="Arquivar documento"
                              description={`O documento "${doc.titulo}" será arquivado (exclusão lógica) e deixa de aparecer na lista principal. Nada é apagado permanentemente.`}
                              confirmLabel="Arquivar"
                              aria-label={`Arquivar documento ${doc.titulo}`}
                              className="!px-2 !py-1"
                              onConfirm={archiveDocument.bind(null, id, doc.id)}
                            >
                              Arquivar
                            </ConfirmButton>
                          ) : (
                            <form action={restoreDocument.bind(null, id, doc.id)}>
                              <Button type="submit" size="sm" variant="ghost" className="!px-2 !py-1">
                                Restaurar
                              </Button>
                            </form>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canManageDocuments && (
                <form
                  action={addDocument.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                >
                  <Field label="Título" htmlFor="doc-titulo">
                    <Input id="doc-titulo" name="titulo" required placeholder="Ex: Contrato de prestação de serviços" />
                  </Field>
                  <Field label="Categoria" htmlFor="doc-categoria">
                    <Select id="doc-categoria" name="categoria" defaultValue="outros">
                      {Object.entries(EVENT_DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Responsável" htmlFor="doc-responsavelId">
                    <Select id="doc-responsavelId" name="responsavelId" required defaultValue="">
                      <option value="" disabled>
                        Selecione
                      </option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Link de referência" htmlFor="doc-urlReferencia" hint="Ex: link do Drive/SharePoint onde o arquivo está guardado">
                    <Input id="doc-urlReferencia" name="urlReferencia" type="url" placeholder="https://..." />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Descrição" htmlFor="doc-descricao">
                      <Input id="doc-descricao" name="descricao" placeholder="Opcional" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Registrar documento
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "participantes" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
                  <p className="text-lg font-semibold text-[var(--foreground)]">{confirmedRegistrations.length}</p>
                  <p className="text-xs text-fg-muted">Confirmados</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-success-50 p-3">
                  <p className="text-lg font-semibold text-success-700">{presentesCount}</p>
                  <p className="text-xs text-fg-muted">Presentes</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
                  <p className="text-lg font-semibold text-[var(--foreground)]">{ausentesCount}</p>
                  <p className="text-xs text-fg-muted">Ausentes</p>
                </div>
              </div>

              <form method="get" className="flex items-end gap-2">
                <input type="hidden" name="tab" value="participantes" />
                <div className="flex-1">
                  <Field label="Localizar participante" htmlFor="participantesBusca">
                    <Input id="participantesBusca" name="participantesBusca" defaultValue={participantesBusca} placeholder="Buscar por nome..." />
                  </Field>
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
              </form>

              {visibleRegistrations.length === 0 ? (
                <EmptyState title="Nenhuma inscrição encontrada." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {visibleRegistrations.map((reg) => {
                    const participant = participantById.get(reg.participantId);
                    return (
                      <li key={reg.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                        <div>
                          <p className="font-medium text-[var(--foreground)] flex items-center gap-2 flex-wrap">
                            {participant?.nome ?? "Participante"}
                            {reg.checkInAt && <Badge tone="success">Presente</Badge>}
                          </p>
                          <p className="text-xs text-fg-muted">
                            {participant?.email}
                            {reg.lote ? ` · ${reg.lote}` : ""}
                            {reg.categoria ? ` · ${reg.categoria}` : ""}
                          </p>
                          {reg.checkInAt && (
                            <p className="text-xs text-fg-muted mt-0.5">
                              Check-in às {formatDateTime(reg.checkInAt)}
                              {reg.checkInPorId ? ` · por ${userById.get(reg.checkInPorId)?.nome ?? ""}` : ""}
                            </p>
                          )}
                        </div>
                        {canManageRegistrations ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <RegistrationStatusSelect eventId={id} registrationId={reg.id} current={reg.status} />
                            {reg.status === "confirmada" &&
                              (reg.checkInAt ? (
                                <form action={undoCheckInRegistration.bind(null, id, reg.id)}>
                                  <Button type="submit" size="sm" variant="ghost" className="!px-2 !py-1">
                                    Desfazer check-in
                                  </Button>
                                </form>
                              ) : (
                                <form action={checkInRegistration.bind(null, id, reg.id)}>
                                  <Button type="submit" size="sm" variant="secondary" className="!px-2 !py-1">
                                    Registrar check-in
                                  </Button>
                                </form>
                              ))}
                            <ConfirmButton
                              size="sm"
                              variant="ghost"
                              title="Remover inscrição"
                              description={`A inscrição de "${participant?.nome ?? "este participante"}" será removida deste evento. O cadastro do participante no catálogo não é afetado.`}
                              confirmLabel="Remover"
                              aria-label={`Remover inscrição de ${participant?.nome ?? ""}`}
                              className="!px-2 !py-1 !text-danger-700"
                              onConfirm={removeRegistration.bind(null, id, reg.id)}
                            >
                              Remover
                            </ConfirmButton>
                          </div>
                        ) : (
                          <Badge tone="brand">{REGISTRATION_STATUS_LABELS[reg.status]}</Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {canManageRegistrations && (
                <form
                  action={addRegistration.bind(null, id)}
                  className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                >
                  <Field label="Participante" htmlFor="reg-participantId">
                    <Select id="reg-participantId" name="participantId" required defaultValue="">
                      <option value="" disabled>
                        Selecione
                      </option>
                      {availableParticipants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {p.email}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Lote" htmlFor="reg-lote" hint="Opcional">
                    <Input id="reg-lote" name="lote" placeholder="Ex: 1º lote" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary" size="sm">
                      Registrar inscrição
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "orcamento" && canViewFinancials && (
            <div className="space-y-6">
              <form action={saveBudget.bind(null, id)} className="max-w-md space-y-3">
                <Field label="Valor previsto (R$)" htmlFor="valorPrevisto">
                  <Input
                    id="valorPrevisto"
                    name="valorPrevisto"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={budget?.valorPrevisto ?? ""}
                    disabled={!canBudget}
                  />
                </Field>
                <Field label="Status" htmlFor="budgetStatus">
                  <Select id="budgetStatus" name="status" defaultValue={budget?.status ?? "previsto"} disabled={!canBudget}>
                    <option value="previsto">Previsto</option>
                    <option value="em_analise">Em análise</option>
                    <option value="aprovado">Aprovado</option>
                  </Select>
                </Field>
                <Field label="Observações" htmlFor="observacoes">
                  <Textarea id="observacoes" name="observacoes" defaultValue={budget?.observacoes} disabled={!canBudget} />
                </Field>
                {canBudget && (
                  <Button type="submit" size="sm">
                    Salvar orçamento
                  </Button>
                )}
              </form>

              {/* Financeiro detalhado (docs/FASE_02_GESTAO.md seção 9) */}
              <div className="pt-4 border-t border-border-subtle space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
                    <p className="text-base font-semibold text-[var(--foreground)]">{formatCurrency(orcamentoTotal)}</p>
                    <p className="text-xs text-fg-muted">Orçamento total</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
                    <p className="text-base font-semibold text-[var(--foreground)]">{formatCurrency(comprometido)}</p>
                    <p className="text-xs text-fg-muted">Comprometido</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3">
                    <p className="text-base font-semibold text-[var(--foreground)]">{formatCurrency(realizado)}</p>
                    <p className="text-xs text-fg-muted">Realizado</p>
                  </div>
                  <div className={`rounded-[var(--radius-sm)] p-3 ${saldo < 0 ? "bg-danger-50" : "bg-success-50"}`}>
                    <p className={`text-base font-semibold ${saldo < 0 ? "text-danger-700" : "text-success-700"}`}>
                      {formatCurrency(saldo)}
                    </p>
                    <p className="text-xs text-fg-muted">Saldo</p>
                  </div>
                </div>
                <p className="text-sm text-fg-muted">
                  Variação previsto x realizado:{" "}
                  <strong className={variacaoRealizado > 0 ? "text-danger-700" : "text-success-700"}>
                    {variacaoRealizado > 0 ? "+" : ""}
                    {formatCurrency(variacaoRealizado)}
                  </strong>
                  {custoPorParticipante != null && (
                    <>
                      {" "}
                      · Custo por participante confirmado: <strong>{formatCurrency(custoPorParticipante)}</strong>
                    </>
                  )}
                </p>
                {custoPorCategoria.size > 0 && (
                  <div>
                    <p className="text-xs text-fg-muted uppercase tracking-wide mb-1.5">Custo por categoria</p>
                    <ul className="space-y-1">
                      {Array.from(custoPorCategoria.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([categoria, valor]) => (
                          <li key={categoria} className="flex items-center justify-between text-sm">
                            <span className="text-[var(--foreground)]">{categoria}</span>
                            <span className="text-fg-muted">{formatCurrency(valor)}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border-subtle space-y-4">
                <p className="text-xs font-semibold uppercase text-fg-muted">Itens de orçamento</p>
                {budgetItems.length === 0 ? (
                  <EmptyState title="Nenhum item de orçamento cadastrado." />
                ) : (
                  <ul className="divide-y divide-border-subtle -mx-5">
                    {budgetItems.map((item) => (
                      <li key={item.id} className="px-5 py-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{item.descricao}</p>
                            <p className="text-xs text-fg-muted">
                              {item.categoria}
                              {item.supplierId ? ` · ${supplierById.get(item.supplierId)?.nome ?? ""}` : ""}
                            </p>
                          </div>
                          {canBudget ? (
                            <div className="flex items-center gap-2">
                              <BudgetItemStatusSelect eventId={id} itemId={item.id} current={item.status} />
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                title="Remover item de orçamento"
                                description={`O item "${item.descricao}" será removido permanentemente do orçamento deste evento.`}
                                confirmLabel="Remover"
                                aria-label={`Remover item ${item.descricao}`}
                                className="!px-2 !py-1 !text-danger-700"
                                onConfirm={removeBudgetItem.bind(null, id, item.id)}
                              >
                                Remover
                              </ConfirmButton>
                            </div>
                          ) : (
                            <Badge tone="brand">{BUDGET_ITEM_STATUS_LABELS[item.status]}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-fg-muted">
                          {item.valorCotado != null && `Cotado: ${formatCurrency(item.valorCotado)}`}
                          {item.valorContratado != null && ` · Contratado: ${formatCurrency(item.valorContratado)}`}
                          {item.valorRealizado != null && ` · Realizado: ${formatCurrency(item.valorRealizado)}`}
                        </p>
                        {canBudget && (
                          <form
                            action={updateBudgetItemValues.bind(null, id, item.id)}
                            className="flex flex-wrap items-end gap-2"
                          >
                            <Field label="Cotado (R$)" htmlFor={`vc-${item.id}`}>
                              <Input id={`vc-${item.id}`} name="valorCotado" type="number" min={0} step="0.01" defaultValue={item.valorCotado ?? ""} className="!py-1 !text-xs" />
                            </Field>
                            <Field label="Contratado (R$)" htmlFor={`vco-${item.id}`}>
                              <Input id={`vco-${item.id}`} name="valorContratado" type="number" min={0} step="0.01" defaultValue={item.valorContratado ?? ""} className="!py-1 !text-xs" />
                            </Field>
                            <Field label="Realizado (R$)" htmlFor={`vr-${item.id}`}>
                              <Input id={`vr-${item.id}`} name="valorRealizado" type="number" min={0} step="0.01" defaultValue={item.valorRealizado ?? ""} className="!py-1 !text-xs" />
                            </Field>
                            <Button type="submit" variant="ghost" size="sm">
                              Salvar valores
                            </Button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canBudget && (
                  <form
                    action={addBudgetItem.bind(null, id)}
                    className="pt-4 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end"
                  >
                    <Field label="Descrição" htmlFor="bi-descricao">
                      <Input id="bi-descricao" name="descricao" required placeholder="Ex: Locação do salão principal" />
                    </Field>
                    <Field label="Categoria" htmlFor="bi-categoria">
                      <Select id="bi-categoria" name="categoria" required defaultValue="">
                        <option value="" disabled>
                          Selecione
                        </option>
                        {CATEGORIAS_ORCAMENTO.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Fornecedor" htmlFor="bi-supplierId" hint="Opcional">
                      <Select id="bi-supplierId" name="supplierId" defaultValue="">
                        <option value="">Nenhum</option>
                        {supplierCatalog.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Valor cotado (R$)" htmlFor="bi-valorCotado" hint="Opcional">
                      <Input id="bi-valorCotado" name="valorCotado" type="number" min={0} step="0.01" />
                    </Field>
                    <div className="sm:col-span-2">
                      <Button type="submit" variant="secondary" size="sm">
                        Adicionar item
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === "complexidade" && (
            <form action={assessComplexity.bind(null, id)} className="max-w-lg space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-fg-muted mb-2">Esforço</p>
                <div className="space-y-2">
                  {EFFORT_FACTOR_KEYS.map((key) => (
                    <FactorSelect key={key} name={key} label={FACTOR_LABELS[key]} defaultValue={factors[key]} disabled={!canComplexity} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-fg-muted mb-2">Impacto</p>
                <div className="space-y-2">
                  {IMPACT_FACTOR_KEYS.map((key) => (
                    <FactorSelect key={key} name={key} label={FACTOR_LABELS[key]} defaultValue={factors[key]} disabled={!canComplexity} />
                  ))}
                </div>
              </div>
              <div className="text-sm bg-surface-muted rounded-[var(--radius-sm)] p-3">
                <p>
                  Esforço: <strong>{preview.esforco}</strong> · Impacto: <strong>{preview.impacto}</strong>
                </p>
                <p>
                  Pontuação: <strong>{preview.pontuacao}</strong> · Nível: <Badge tone="brand">{COMPLEXITY_LEVEL_LABELS[preview.nivel]}</Badge>
                </p>
              </div>
              {canComplexity && (
                <Button type="submit" size="sm">
                  Recalcular complexidade
                </Button>
              )}
            </form>
          )}

          {activeTab === "historico" && (
            <>
              {history.length === 0 ? (
                <EmptyState title="Sem histórico registrado." />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-5">
                  {history.map((h) => (
                    <li key={h.id} className="px-5 py-3 text-sm flex items-center justify-between">
                      <span>
                        {h.statusAnterior ? `${EVENT_STATUS_LABELS[h.statusAnterior]} → ` : "Criado como "}
                        <strong>{EVENT_STATUS_LABELS[h.statusNovo]}</strong>
                      </span>
                      <span className="text-xs text-fg-muted">{formatDateTime(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted uppercase tracking-wide">{label}</dt>
      <dd className="text-[var(--foreground)] mt-0.5">{value}</dd>
    </div>
  );
}

function FactorSelect({
  name,
  label,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue: number;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--foreground)]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm disabled:bg-surface-muted"
      >
        <option value={0}>Nenhum</option>
        <option value={1}>Baixo</option>
        <option value={2}>Médio</option>
        <option value={3}>Alto</option>
      </select>
    </label>
  );
}
