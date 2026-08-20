import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import {
  EVENT_STATUS_LABELS,
  CHECKLIST_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  type EventStatus,
} from "@/lib/domain/types";
import {
  COMPLEXITY_LEVEL_LABELS,
  EFFORT_FACTOR_KEYS,
  IMPACT_FACTOR_KEYS,
  FACTOR_LABELS,
  defaultComplexityFactors,
  calculateComplexity,
} from "@/lib/domain/complexity";
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

const STATUS_FLOW: EventStatus[] = [
  "rascunho",
  "planejamento",
  "aguardando_aprovacao",
  "confirmado",
  "em_execucao",
  "concluido",
];

const TAB_KEYS = ["visao-geral", "sessoes", "reservas", "checklist", "orcamento", "complexidade", "historico"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string; reservationCreated?: string; created?: string; tab?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;
  const { error, updated, reservationCreated, created, tab } = await searchParams;
  const activeTab: TabKey = (TAB_KEYS as readonly string[]).includes(tab ?? "") ? (tab as TabKey) : "visao-geral";

  const event = await repository.events.get(session, id);
  if (!event) notFound();

  const [sessions, reservations, checklist, budget, complexity, history, users, space] = await Promise.all([
    repository.events.getSessions(session, id),
    repository.reservations.list(session, { eventId: id }),
    repository.checklist.listByEvent(session, id),
    repository.budget.getByEvent(session, id),
    repository.complexity.getLatestByEvent(session, id),
    repository.events.getStatusHistory(session, id),
    repository.users.list(session),
    event.spaceId ? repository.spaces.get(session, event.spaceId) : Promise.resolve(null),
  ]);
  const spaceById = new Map((await repository.spaces.list(session)).map((s) => [s.id, s]));

  const userById = new Map(users.map((u) => [u.id, u]));
  const canEdit = can(session.perfil, "create_edit_event");
  const canChecklist = can(session.perfil, "manage_checklist");
  const canBudget = can(session.perfil, "manage_budget");
  const canComplexity = can(session.perfil, "assess_complexity");
  const canCancel = can(session.perfil, "cancel_delete_event");
  const canManageReservations = can(session.perfil, "manage_reservations");
  // Operador (só "create_event"): pode continuar o próprio rascunho pelo
  // assistente, mas não tem "Editar"/"Avançar status" (exclusivos do Gestor/Admin).
  const canContinueOwnDraft =
    !canEdit && can(session.perfil, "create_event") && event.createdBy === session.userId && event.status === "rascunho";

  const doneCount = checklist.filter((c) => c.status === "concluido").length;
  const checklistPct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

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
            { key: "orcamento", label: "Orçamento" },
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

          {activeTab === "orcamento" && (
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
              {budget && (
                <p className="text-sm text-fg-muted">
                  Valor atual: <strong>{formatCurrency(budget.valorPrevisto)}</strong>
                </p>
              )}
              {canBudget && (
                <Button type="submit" size="sm">
                  Salvar orçamento
                </Button>
              )}
            </form>
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
