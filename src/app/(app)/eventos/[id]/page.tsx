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
import { Card, CardHeader, Badge, Banner, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
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

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string; reservationCreated?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;
  const { error, updated, reservationCreated } = await searchParams;

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

  const userById = new Map(users.map((u) => [u.id, u]));
  const canEdit = can(session.perfil, "create_edit_event");
  const canChecklist = can(session.perfil, "manage_checklist");
  const canBudget = can(session.perfil, "manage_budget");
  const canComplexity = can(session.perfil, "assess_complexity");
  const canCancel = can(session.perfil, "cancel_delete_event");

  const doneCount = checklist.filter((c) => c.status === "concluido").length;
  const checklistPct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  const factors = complexity?.fatores ?? defaultComplexityFactors();
  const preview = calculateComplexity(factors);

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(event.status) + 1];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">{event.titulo}</h1>
            <Badge tone="brand">{EVENT_STATUS_LABELS[event.status]}</Badge>
            {event.estrategico && <Badge tone="warning">Estratégico</Badge>}
          </div>
          <p className="text-sm text-fg-muted">
            {event.demandante} · {event.categoria}
            {event.tematica ? ` · ${event.tematica}` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && <ButtonLink href={`/eventos/${id}/editar`} variant="secondary" size="sm">Editar</ButtonLink>}
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
              description="O evento será marcado como cancelado. O histórico é preservado."
              confirmLabel="Cancelar evento"
              onConfirm={cancelEvent.bind(null, id)}
            >
              Cancelar evento
            </ConfirmButton>
          )}
        </div>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}
      {updated === "1" && <Banner tone="success">Evento atualizado com sucesso.</Banner>}
      {reservationCreated === "1" && <Banner tone="success">Reserva criada e vinculada a este evento.</Banner>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Dados gerais" />
            <dl className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
              <Info label="Responsável" value={userById.get(event.responsavelId)?.nome ?? "—"} />
              <Info label="Contato do demandante" value={event.contatoDemandante ?? "—"} />
              <Info label="Localização" value={`${event.tipoLocalizacao === "interno" ? "Interno" : "Externo"} · ${space?.nome ?? event.local ?? "—"}`} />
              <Info label="Formato" value={event.formato ?? "—"} />
              <Info label="Escopo" value={event.escopo ?? "—"} />
              <Info label="Segmento" value={event.segmento ?? "—"} />
              <Info label="Classificação" value={event.classificacao ?? "—"} />
              <Info label="Público-alvo" value={event.publicoAlvo ?? "—"} />
              <Info label="Restrito" value={event.restrito ? "Sim" : "Não"} />
              <Info label="Previsto em orçamento" value={event.previstoOrcamento ? "Sim" : "Não"} />
            </dl>
            {event.descricao && (
              <div className="px-5 pb-5">
                <p className="text-sm text-fg-muted">{event.descricao}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Sessões" description={`${sessions.length} sessão(ões)`} />
            <ul className="divide-y divide-border-subtle">
              {sessions.map((s) => (
                <li key={s.id} className="px-5 py-3 text-sm flex items-center justify-between">
                  <span>
                    {formatDateTime(s.inicio)} até {formatDateTime(s.fim)}
                  </span>
                  {s.observacao && <span className="text-xs text-fg-muted">{s.observacao}</span>}
                </li>
              ))}
            </ul>
            {canEdit && (
              <form action={addEventSession.bind(null, id)} className="p-5 border-t border-border-subtle grid sm:grid-cols-3 gap-3 items-end">
                <Field label="Início" htmlFor="s-inicio">
                  <Input id="s-inicio" name="inicio" type="datetime-local" required />
                </Field>
                <Field label="Fim" htmlFor="s-fim">
                  <Input id="s-fim" name="fim" type="datetime-local" required />
                </Field>
                <Button type="submit" variant="secondary" size="sm">Adicionar sessão</Button>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Reservas vinculadas"
              actions={<Link href={`/reservas/nova?eventId=${id}`} className="text-sm text-brand-700 font-medium hover:underline">Nova reserva</Link>}
            />
            {reservations.length === 0 ? (
              <EmptyState title="Nenhuma reserva vinculada a este evento." />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {reservations.map((r) => (
                  <li key={r.id} className="px-5 py-3 flex items-center justify-between text-sm gap-3 flex-wrap">
                    <span>
                      {formatDateTime(r.inicio)} até {formatDateTime(r.fim)} — {r.motivo}
                    </span>
                    <Badge tone={r.status === "confirmada" ? "success" : r.status === "cancelada" ? "danger" : "warning"}>
                      {RESERVATION_STATUS_LABELS[r.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Checklist / planejamento" description={`${doneCount}/${checklist.length} concluídos (${checklistPct}%)`} />
            <div className="h-1.5 bg-surface-muted mx-5 rounded-full overflow-hidden">
              <div className="h-full bg-success-500 rounded-full" style={{ width: `${checklistPct}%` }} />
            </div>
            {checklist.length === 0 ? (
              <EmptyState title="Nenhum item de checklist cadastrado." />
            ) : (
              <ul className="divide-y divide-border-subtle mt-3">
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
                        <form action={removeChecklistItem.bind(null, id, item.id)}>
                          <button type="submit" className="text-xs text-danger-700 hover:underline">
                            Remover
                          </button>
                        </form>
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
              <form action={addChecklistItem.bind(null, id)} className="p-5 border-t border-border-subtle grid sm:grid-cols-2 gap-3 items-end">
                <Field label="Novo item" htmlFor="c-titulo">
                  <Input id="c-titulo" name="titulo" required placeholder="Ex: Confirmar fornecedor de catering" />
                </Field>
                <Field label="Categoria" htmlFor="c-categoria">
                  <Input id="c-categoria" name="categoria" placeholder="Logística, Comunicação..." />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="secondary" size="sm">Adicionar item</Button>
                </div>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader title="Histórico de status" />
            {history.length === 0 ? (
              <EmptyState title="Sem histórico registrado." />
            ) : (
              <ul className="divide-y divide-border-subtle">
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
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Orçamento" />
            <form action={saveBudget.bind(null, id)} className="p-5 space-y-3">
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
          </Card>

          <Card>
            <CardHeader title="Complexidade" description={complexity ? `${COMPLEXITY_LEVEL_LABELS[complexity.nivel]} (${complexity.pontuacao} pts)` : "Não avaliada"} />
            <form action={assessComplexity.bind(null, id)} className="p-5 space-y-4">
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
                  Pontuação: <strong>{preview.pontuacao}</strong> · Nível:{" "}
                  <Badge tone="brand">{COMPLEXITY_LEVEL_LABELS[preview.nivel]}</Badge>
                </p>
              </div>
              {canComplexity && (
                <Button type="submit" size="sm">
                  Recalcular complexidade
                </Button>
              )}
            </form>
          </Card>
        </div>
      </div>
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
