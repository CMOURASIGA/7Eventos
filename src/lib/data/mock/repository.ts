import type {
  AuditLog,
  AuthSession,
  BudgetItem,
  ChecklistItem,
  ComplexityAssessment,
  EventDocument,
  EventEntity,
  EventRegistration,
  EventSession,
  EventSupplier,
  EventTeamMember,
  NotificationItem,
  Participant,
  Reservation,
  ScheduleItem,
  Space,
  Supplier,
  User,
} from "@/lib/domain/types";
import { EVENT_STATUS_LABELS, RESERVATION_STATUS_LABELS, ROLE_LABELS } from "@/lib/domain/types";
import { assertCan, assertCanCreateEvent, can, PermissionError } from "@/lib/domain/permissions";
import { checkAvailability } from "@/lib/domain/availability";
import { calculateComplexity, COMPLEXITY_LEVEL_LABELS } from "@/lib/domain/complexity";
import type {
  DashboardData,
  DashboardPeriod,
  EventSearchFilters,
  Repository,
  ReservationSearchFilters,
  SpaceSearchFilters,
} from "../repository";
import { getStore, nextId } from "./store";

/**
 * Implementação de demonstração da camada de dados: opera sobre o
 * estado em memória de `store.ts`. Aplica as mesmas regras de
 * isolamento (RN01) e permissão (RN11) que a implementação Supabase,
 * para que a UI nunca dependa de qual fonte está ativa.
 */

function requireCompany(session: AuthSession): string {
  if (!session.companyId) {
    throw new Error("Sessão sem empresa vinculada não pode operar dados operacionais.");
  }
  return session.companyId;
}

function scoped<T extends { companyId: string }>(session: AuthSession, items: T[]): T[] {
  const companyId = requireCompany(session);
  return items.filter((i) => i.companyId === companyId);
}

function nowIso(): string {
  return new Date().toISOString();
}

function pushAudit(
  session: AuthSession,
  entry: Omit<AuditLog, "id" | "companyId" | "userId" | "createdAt">,
) {
  const store = getStore();
  const companyId = requireCompany(session);
  store.auditLogs.push({
    id: nextId("audit"),
    companyId,
    userId: session.userId,
    createdAt: nowIso(),
    ...entry,
  });
}

export const mockRepository: Repository = {
  companies: {
    async list(session) {
      const store = getStore();
      if (session.perfil === "superadmin") return store.companies;
      const companyId = requireCompany(session);
      return store.companies.filter((c) => c.id === companyId);
    },
    async get(session, id) {
      const store = getStore();
      const company = store.companies.find((c) => c.id === id) ?? null;
      if (!company) return null;
      if (session.perfil !== "superadmin" && company.id !== session.companyId) return null;
      return company;
    },
  },

  users: {
    async list(session) {
      const store = getStore();
      const companyId = requireCompany(session);
      return store.users.filter((u) => u.companyId === companyId);
    },
    async get(session, id) {
      const store = getStore();
      const user = store.users.find((u) => u.id === id) ?? null;
      if (!user) return null;
      if (session.perfil !== "superadmin" && user.companyId !== session.companyId) return null;
      return user;
    },
    async getByEmail(email) {
      const store = getStore();
      return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_company_users");
      const store = getStore();
      const companyId = requireCompany(session);
      const user: User = {
        id: nextId("user"),
        companyId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input,
      };
      store.users.push(user);
      pushAudit(session, {
        acao: "administrativo",
        entidade: "usuario",
        entidadeId: user.id,
        descricao: `Usuário "${user.nome}" criado com perfil ${ROLE_LABELS[user.perfil]}.`,
      });
      return user;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_company_users");
      const store = getStore();
      const companyId = requireCompany(session);
      const user = store.users.find((u) => u.id === id && u.companyId === companyId);
      if (!user) throw new Error("Usuário não encontrado.");
      Object.assign(user, input, { updatedAt: nowIso() });
      pushAudit(session, {
        acao: "administrativo",
        entidade: "usuario",
        entidadeId: user.id,
        descricao: `Usuário "${user.nome}" atualizado.`,
      });
      return user;
    },
  },

  spaces: {
    async list(session, filters) {
      const store = getStore();
      let items = scoped(session, store.spaces);
      if (filters?.local) items = items.filter((s) => s.local.toLowerCase().includes(filters.local!.toLowerCase()));
      if (filters?.nome) items = items.filter((s) => s.nome.toLowerCase().includes(filters.nome!.toLowerCase()));
      if (filters?.status) items = items.filter((s) => s.status === filters.status);
      if (filters?.capacidadeMinima != null) items = items.filter((s) => s.capacidade >= filters.capacidadeMinima!);
      return items;
    },
    async get(session, id) {
      const store = getStore();
      const space = scoped(session, store.spaces).find((s) => s.id === id);
      return space ?? null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_spaces");
      const store = getStore();
      const companyId = requireCompany(session);
      const space: Space = {
        id: nextId("space"),
        companyId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input,
      };
      store.spaces.push(space);
      pushAudit(session, { acao: "criacao", entidade: "espaco", entidadeId: space.id, descricao: `Espaço "${space.nome}" criado.` });
      return space;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_spaces");
      const store = getStore();
      const space = scoped(session, store.spaces).find((s) => s.id === id);
      if (!space) throw new Error("Espaço não encontrado.");
      Object.assign(space, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "espaco", entidadeId: space.id, descricao: `Espaço "${space.nome}" editado.` });
      return space;
    },
    async setStatus(session, id, status) {
      assertCan(session.perfil, "manage_spaces");
      const store = getStore();
      const space = scoped(session, store.spaces).find((s) => s.id === id);
      if (!space) throw new Error("Espaço não encontrado.");
      space.status = status;
      space.updatedAt = nowIso();
      pushAudit(session, {
        acao: status === "inativo" ? "cancelamento" : "edicao",
        entidade: "espaco",
        entidadeId: space.id,
        descricao: `Espaço "${space.nome}" marcado como ${status === "inativo" ? "inativo" : "ativo"}.`,
      });
      return space;
    },
  },

  reservations: {
    async list(session, filters) {
      const store = getStore();
      let items = scoped(session, store.reservations);
      if (filters?.spaceId) items = items.filter((r) => r.spaceId === filters.spaceId);
      if (filters?.status) items = items.filter((r) => r.status === filters.status);
      if (filters?.eventId !== undefined) items = items.filter((r) => (r.eventId ?? null) === filters.eventId);
      if (filters?.dataInicial) items = items.filter((r) => r.inicio >= filters.dataInicial!);
      if (filters?.dataFinal) items = items.filter((r) => r.inicio <= filters.dataFinal!);
      return items.sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    async get(session, id) {
      const store = getStore();
      return scoped(session, store.reservations).find((r) => r.id === id) ?? null;
    },
    async checkAvailability(session, input) {
      const store = getStore();
      const space = scoped(session, store.spaces).find((s) => s.id === input.spaceId);
      if (!space) {
        return { available: false, issues: [{ code: "espaco_inativo", message: "Espaço não encontrado." }] };
      }
      const companyId = requireCompany(session);
      const existing = store.reservations.filter((r) => r.companyId === companyId);
      const result = checkAvailability({
        space,
        inicio: input.inicio,
        fim: input.fim,
        quantidadePessoas: input.quantidadePessoas,
        existingReservations: existing,
        ignoreReservationId: input.ignoreReservationId,
      });
      return { available: result.available, issues: result.issues };
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_reservations");
      const store = getStore();
      const companyId = requireCompany(session);
      const space = store.spaces.find((s) => s.id === input.spaceId && s.companyId === companyId);
      if (!space) throw new Error("Espaço não encontrado.");

      const availability = checkAvailability({
        space,
        inicio: input.inicio,
        fim: input.fim,
        quantidadePessoas: input.quantidadePessoas,
        existingReservations: store.reservations.filter((r) => r.companyId === companyId),
      });
      if (!availability.available) {
        throw new Error(availability.issues.map((i) => i.message).join(" "));
      }

      const reservation: Reservation = {
        id: nextId("reservation"),
        companyId,
        status: "confirmada",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input,
      };
      store.reservations.push(reservation);
      pushAudit(session, {
        acao: "reserva",
        entidade: "reserva",
        entidadeId: reservation.id,
        descricao: `Reserva do espaço "${space.nome}" criada (${input.motivo}).`,
      });
      return reservation;
    },
    async updateStatus(session, id, status) {
      assertCan(session.perfil, "manage_reservations");
      const store = getStore();
      const reservation = scoped(session, store.reservations).find((r) => r.id === id);
      if (!reservation) throw new Error("Reserva não encontrada.");
      reservation.status = status;
      reservation.updatedAt = nowIso();
      pushAudit(session, {
        acao: status === "cancelada" ? "cancelamento" : "edicao",
        entidade: "reserva",
        entidadeId: reservation.id,
        descricao: `Reserva atualizada para status ${RESERVATION_STATUS_LABELS[status]}.`,
      });
      return reservation;
    },
    async linkToEvent(session, id, eventId) {
      assertCan(session.perfil, "manage_reservations");
      const store = getStore();
      const reservation = scoped(session, store.reservations).find((r) => r.id === id);
      if (!reservation) throw new Error("Reserva não encontrada.");
      const event = scoped(session, store.events).find((e) => e.id === eventId);
      if (!event) throw new Error("Evento não encontrado.");
      reservation.eventId = eventId;
      reservation.updatedAt = nowIso();
      pushAudit(session, {
        acao: "edicao",
        entidade: "reserva",
        entidadeId: reservation.id,
        descricao: `Reserva vinculada ao evento "${event.titulo}".`,
      });
      return reservation;
    },
  },

  events: {
    async search(session, filters) {
      const store = getStore();
      let items = scoped(session, store.events);
      if (filters.texto) {
        const q = filters.texto.toLowerCase();
        items = items.filter((e) => e.titulo.toLowerCase().includes(q));
      }
      if (filters.demandante) items = items.filter((e) => e.demandante.toLowerCase().includes(filters.demandante!.toLowerCase()));
      if (filters.status) items = items.filter((e) => e.status === filters.status);
      if (filters.spaceId) items = items.filter((e) => e.spaceId === filters.spaceId);
      if (filters.tematica) items = items.filter((e) => e.tematica === filters.tematica);
      if (filters.estrategico != null) items = items.filter((e) => e.estrategico === filters.estrategico);
      if (filters.dataInicial) items = items.filter((e) => getEventMainStart(store, e.id) >= filters.dataInicial!);
      if (filters.dataFinal) items = items.filter((e) => getEventMainStart(store, e.id) <= filters.dataFinal!);
      if (filters.complexidade) {
        const byEvent = new Map(store.complexityAssessments.map((c) => [c.eventId, c]));
        items = items.filter((e) => byEvent.get(e.id)?.nivel === filters.complexidade);
      }
      return items.sort((a, b) => getEventMainStart(store, b.id).localeCompare(getEventMainStart(store, a.id)));
    },
    async get(session, id) {
      const store = getStore();
      return scoped(session, store.events).find((e) => e.id === id) ?? null;
    },
    async listUpcoming(session, limit = 5) {
      const store = getStore();
      const now = nowIso();
      return scoped(session, store.events)
        .filter((e) => getEventMainStart(store, e.id) >= now && e.status !== "cancelado")
        .sort((a, b) => getEventMainStart(store, a.id).localeCompare(getEventMainStart(store, b.id)))
        .slice(0, limit);
    },
    async listForAgenda(session, range) {
      const store = getStore();
      const companyId = requireCompany(session);
      const eventsById = new Map(scoped(session, store.events).map((e) => [e.id, e]));
      const sessionsInRange = store.eventSessions.filter(
        (s) => eventsById.has(s.eventId) && s.inicio <= range.to && s.fim >= range.from,
      );
      const grouped = new Map<string, EventSession[]>();
      for (const s of sessionsInRange) {
        const list = grouped.get(s.eventId) ?? [];
        list.push(s);
        grouped.set(s.eventId, list);
      }
      return Array.from(grouped.entries()).map(([eventId, sessions]) => ({
        event: eventsById.get(eventId)!,
        sessions: sessions.sort((a, b) => a.inicio.localeCompare(b.inicio)),
      })).filter((x) => x.event.companyId === companyId);
    },
    async create(session, input, sessions) {
      assertCanCreateEvent(session.perfil);
      const store = getStore();
      const companyId = requireCompany(session);
      const event: EventEntity = {
        id: nextId("event"),
        companyId,
        createdBy: session.userId,
        createdAt: nowIso(),
        updatedBy: session.userId,
        updatedAt: nowIso(),
        ...input,
      };
      store.events.push(event);

      for (const s of sessions) {
        store.eventSessions.push({ id: nextId("session"), eventId: event.id, ...s });
      }

      store.statusHistory.push({
        id: nextId("history"),
        companyId,
        eventId: event.id,
        statusAnterior: null,
        statusNovo: event.status,
        userId: session.userId,
        createdAt: nowIso(),
      });

      pushAudit(session, { acao: "criacao", entidade: "evento", entidadeId: event.id, descricao: `Evento "${event.titulo}" criado.` });
      return event;
    },
    async update(session, id, input) {
      const store = getStore();
      const event = scoped(session, store.events).find((e) => e.id === id);
      if (!event) throw new Error("Evento não encontrado.");
      // Quem só tem "create_event" (Operador) só pode continuar editando o
      // próprio rascunho ainda não publicado — edição plena de qualquer
      // evento é exclusiva de "create_edit_event" (Gestor/Admin).
      const canEditOwnDraft =
        can(session.perfil, "create_event") && event.createdBy === session.userId && event.status === "rascunho";
      if (!can(session.perfil, "create_edit_event") && !canEditOwnDraft) {
        throw new PermissionError("create_edit_event");
      }
      Object.assign(event, input, { updatedBy: session.userId, updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "evento", entidadeId: event.id, descricao: `Evento "${event.titulo}" editado.` });
      return event;
    },
    async updateStatus(session, id, status) {
      assertCan(session.perfil, "create_edit_event");
      const store = getStore();
      const event = scoped(session, store.events).find((e) => e.id === id);
      if (!event) throw new Error("Evento não encontrado.");
      const anterior = event.status;
      event.status = status;
      event.updatedBy = session.userId;
      event.updatedAt = nowIso();
      store.statusHistory.push({
        id: nextId("history"),
        companyId: event.companyId,
        eventId: event.id,
        statusAnterior: anterior,
        statusNovo: status,
        userId: session.userId,
        createdAt: nowIso(),
      });
      pushAudit(session, {
        acao: "alteracao_status",
        entidade: "evento",
        entidadeId: event.id,
        descricao: `Status do evento "${event.titulo}" alterado de ${EVENT_STATUS_LABELS[anterior]} para ${EVENT_STATUS_LABELS[status]}.`,
      });
      return event;
    },
    async cancel(session, id) {
      assertCan(session.perfil, "cancel_delete_event");
      const store = getStore();
      const event = scoped(session, store.events).find((e) => e.id === id);
      if (!event) throw new Error("Evento não encontrado.");
      const anterior = event.status;
      event.status = "cancelado";
      event.updatedBy = session.userId;
      event.updatedAt = nowIso();
      store.statusHistory.push({
        id: nextId("history"),
        companyId: event.companyId,
        eventId: event.id,
        statusAnterior: anterior,
        statusNovo: "cancelado",
        userId: session.userId,
        createdAt: nowIso(),
      });
      pushAudit(session, { acao: "cancelamento", entidade: "evento", entidadeId: event.id, descricao: `Evento "${event.titulo}" cancelado.` });
      return event;
    },
    async getSessions(session, eventId) {
      const store = getStore();
      const event = scoped(session, store.events).find((e) => e.id === eventId);
      if (!event) return [];
      return store.eventSessions.filter((s) => s.eventId === eventId).sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    async replaceSessions(session, eventId, sessions) {
      const store = getStore();
      const event = scoped(session, store.events).find((e) => e.id === eventId);
      if (!event) throw new Error("Evento não encontrado.");
      const canEditOwnDraft =
        can(session.perfil, "create_event") && event.createdBy === session.userId && event.status === "rascunho";
      if (!can(session.perfil, "create_edit_event") && !canEditOwnDraft) {
        throw new PermissionError("create_edit_event");
      }
      store.eventSessions = store.eventSessions.filter((s) => s.eventId !== eventId);
      const created = sessions.map((s) => {
        const session_: EventSession = { id: nextId("session"), eventId, ...s };
        store.eventSessions.push(session_);
        return session_;
      });
      event.updatedAt = nowIso();
      return created;
    },
    async getStatusHistory(session, eventId) {
      const store = getStore();
      const event = scoped(session, store.events).find((e) => e.id === eventId);
      if (!event) return [];
      return store.statusHistory
        .filter((h) => h.eventId === eventId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
  },

  checklist: {
    async listByEvent(session, eventId) {
      const store = getStore();
      const companyId = requireCompany(session);
      return store.checklistItems
        .filter((c) => c.eventId === eventId && c.companyId === companyId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_checklist");
      const store = getStore();
      const companyId = requireCompany(session);
      const item: ChecklistItem = { id: nextId("checklist"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.checklistItems.push(item);
      pushAudit(session, { acao: "criacao", entidade: "checklist", entidadeId: item.id, descricao: `Item de checklist "${item.titulo}" criado.` });
      return item;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_checklist");
      const store = getStore();
      const companyId = requireCompany(session);
      const item = store.checklistItems.find((c) => c.id === id && c.companyId === companyId);
      if (!item) throw new Error("Item de checklist não encontrado.");
      Object.assign(item, input, { updatedAt: nowIso() });
      if (input.status === "concluido" && !item.concluidoEm) item.concluidoEm = nowIso();
      pushAudit(session, { acao: "edicao", entidade: "checklist", entidadeId: item.id, descricao: `Item de checklist "${item.titulo}" atualizado.` });
      return item;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_checklist");
      const store = getStore();
      const companyId = requireCompany(session);
      store.checklistItems = store.checklistItems.filter((c) => !(c.id === id && c.companyId === companyId));
    },
  },

  suppliers: {
    async list(session, filters) {
      const store = getStore();
      let items = scoped(session, store.suppliers);
      if (filters?.nome) items = items.filter((s) => s.nome.toLowerCase().includes(filters.nome!.toLowerCase()));
      if (filters?.categoria) items = items.filter((s) => s.categoria === filters.categoria);
      if (filters?.status) items = items.filter((s) => s.status === filters.status);
      return items.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    async get(session, id) {
      const store = getStore();
      return scoped(session, store.suppliers).find((s) => s.id === id) ?? null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_suppliers");
      const store = getStore();
      const companyId = requireCompany(session);
      const supplier: Supplier = { id: nextId("supplier"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.suppliers.push(supplier);
      pushAudit(session, { acao: "criacao", entidade: "fornecedor", entidadeId: supplier.id, descricao: `Fornecedor "${supplier.nome}" cadastrado.` });
      return supplier;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_suppliers");
      const store = getStore();
      const supplier = scoped(session, store.suppliers).find((s) => s.id === id);
      if (!supplier) throw new Error("Fornecedor não encontrado.");
      Object.assign(supplier, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "fornecedor", entidadeId: supplier.id, descricao: `Fornecedor "${supplier.nome}" editado.` });
      return supplier;
    },
    async setStatus(session, id, status) {
      assertCan(session.perfil, "manage_suppliers");
      const store = getStore();
      const supplier = scoped(session, store.suppliers).find((s) => s.id === id);
      if (!supplier) throw new Error("Fornecedor não encontrado.");
      supplier.status = status;
      supplier.updatedAt = nowIso();
      pushAudit(session, {
        acao: status === "inativo" ? "cancelamento" : "edicao",
        entidade: "fornecedor",
        entidadeId: supplier.id,
        descricao: `Fornecedor "${supplier.nome}" marcado como ${status === "inativo" ? "inativo" : "ativo"}.`,
      });
      return supplier;
    },
  },

  eventSuppliers: {
    async listByEvent(session, eventId) {
      const store = getStore();
      const companyId = requireCompany(session);
      const items = store.eventSuppliers
        .filter((es) => es.eventId === eventId && es.companyId === companyId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      // Mesmo em memória, a camada de dados já sai sem os valores para
      // quem não tem "view_financials" — a UI não é a única linha de
      // defesa (equivalente à separação em tabela própria no Supabase).
      if (can(session.perfil, "view_financials")) return items;
      return items.map((es) => ({ ...es, valorPrevisto: undefined, valorContratado: undefined }));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_suppliers");
      const store = getStore();
      const companyId = requireCompany(session);
      // RN01: evento, fornecedor e responsável interno precisam
      // pertencer à mesma empresa da sessão — a UI só oferece opções
      // corretas, mas o backend não pode confiar só nisso.
      const event = store.events.find((e) => e.id === input.eventId && e.companyId === companyId);
      if (!event) throw new Error("Evento não encontrado.");
      const supplier = store.suppliers.find((s) => s.id === input.supplierId && s.companyId === companyId);
      if (!supplier) throw new Error("Fornecedor não encontrado nesta empresa.");
      if (input.responsavelInternoId) {
        const responsavel = store.users.find((u) => u.id === input.responsavelInternoId && u.companyId === companyId);
        if (!responsavel) throw new Error("Responsável interno inválido para esta empresa.");
      }
      if (input.valorPrevisto != null && input.valorPrevisto < 0) throw new Error("Valor previsto não pode ser negativo.");
      if (input.valorContratado != null && input.valorContratado < 0) throw new Error("Valor contratado não pode ser negativo.");
      const link: EventSupplier = { id: nextId("event_supplier"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.eventSuppliers.push(link);
      pushAudit(session, {
        acao: "criacao",
        entidade: "fornecedor_evento",
        entidadeId: link.id,
        descricao: `Fornecedor "${supplier.nome}" vinculado ao evento (${input.servico}).`,
      });
      return link;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_suppliers");
      const store = getStore();
      const companyId = requireCompany(session);
      const link = store.eventSuppliers.find((es) => es.id === id && es.companyId === companyId);
      if (!link) throw new Error("Vínculo de fornecedor não encontrado.");
      if (input.responsavelInternoId) {
        const responsavel = store.users.find((u) => u.id === input.responsavelInternoId && u.companyId === companyId);
        if (!responsavel) throw new Error("Responsável interno inválido para esta empresa.");
      }
      if (input.valorPrevisto != null && input.valorPrevisto < 0) throw new Error("Valor previsto não pode ser negativo.");
      if (input.valorContratado != null && input.valorContratado < 0) throw new Error("Valor contratado não pode ser negativo.");
      Object.assign(link, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "fornecedor_evento", entidadeId: link.id, descricao: "Vínculo de fornecedor atualizado." });
      return link;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_suppliers");
      const store = getStore();
      const companyId = requireCompany(session);
      store.eventSuppliers = store.eventSuppliers.filter((es) => !(es.id === id && es.companyId === companyId));
    },
  },

  team: {
    async listByEvent(session, eventId) {
      const store = getStore();
      const companyId = requireCompany(session);
      return store.teamMembers
        .filter((m) => m.eventId === eventId && m.companyId === companyId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_team");
      const store = getStore();
      const companyId = requireCompany(session);
      const event = store.events.find((e) => e.id === input.eventId && e.companyId === companyId);
      if (!event) throw new Error("Evento não encontrado.");
      const user = store.users.find((u) => u.id === input.userId && u.companyId === companyId);
      if (!user) throw new Error("Usuário não encontrado nesta empresa.");
      if (user.status !== "ativo") throw new Error("Usuário inativo não pode ser alocado à equipe.");
      const duplicate = store.teamMembers.find((m) => m.eventId === input.eventId && m.userId === input.userId);
      if (duplicate) throw new Error("Este usuário já está alocado à equipe deste evento.");
      const member: EventTeamMember = { id: nextId("team_member"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.teamMembers.push(member);
      pushAudit(session, {
        acao: "criacao",
        entidade: "equipe_evento",
        entidadeId: member.id,
        descricao: `${user.nome} adicionado à equipe do evento como ${input.funcao}.`,
      });
      return member;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_team");
      const store = getStore();
      const companyId = requireCompany(session);
      const member = store.teamMembers.find((m) => m.id === id && m.companyId === companyId);
      if (!member) throw new Error("Membro de equipe não encontrado.");
      Object.assign(member, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "equipe_evento", entidadeId: member.id, descricao: "Membro de equipe atualizado." });
      return member;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_team");
      const store = getStore();
      const companyId = requireCompany(session);
      store.teamMembers = store.teamMembers.filter((m) => !(m.id === id && m.companyId === companyId));
    },
  },

  participants: {
    async list(session, filters) {
      const store = getStore();
      let items = scoped(session, store.participants);
      if (filters?.nome) items = items.filter((p) => p.nome.toLowerCase().includes(filters.nome!.toLowerCase()));
      if (filters?.categoria) items = items.filter((p) => p.categoria === filters.categoria);
      if (filters?.status) items = items.filter((p) => p.status === filters.status);
      return items.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    async get(session, id) {
      const store = getStore();
      return scoped(session, store.participants).find((p) => p.id === id) ?? null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_participants");
      const store = getStore();
      const companyId = requireCompany(session);
      const participant: Participant = { id: nextId("participant"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.participants.push(participant);
      pushAudit(session, { acao: "criacao", entidade: "participante", entidadeId: participant.id, descricao: `Participante "${participant.nome}" cadastrado.` });
      return participant;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_participants");
      const store = getStore();
      const participant = scoped(session, store.participants).find((p) => p.id === id);
      if (!participant) throw new Error("Participante não encontrado.");
      Object.assign(participant, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "participante", entidadeId: participant.id, descricao: `Participante "${participant.nome}" editado.` });
      return participant;
    },
    async setStatus(session, id, status) {
      assertCan(session.perfil, "manage_participants");
      const store = getStore();
      const participant = scoped(session, store.participants).find((p) => p.id === id);
      if (!participant) throw new Error("Participante não encontrado.");
      participant.status = status;
      participant.updatedAt = nowIso();
      pushAudit(session, {
        acao: status === "inativo" ? "cancelamento" : "edicao",
        entidade: "participante",
        entidadeId: participant.id,
        descricao: `Participante "${participant.nome}" marcado como ${status === "inativo" ? "inativo" : "ativo"}.`,
      });
      return participant;
    },
  },

  registrations: {
    async listByEvent(session, eventId) {
      const store = getStore();
      const companyId = requireCompany(session);
      return store.registrations
        .filter((r) => r.eventId === eventId && r.companyId === companyId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_registrations");
      const store = getStore();
      const companyId = requireCompany(session);
      const event = store.events.find((e) => e.id === input.eventId && e.companyId === companyId);
      if (!event) throw new Error("Evento não encontrado.");
      const participant = store.participants.find((p) => p.id === input.participantId && p.companyId === companyId);
      if (!participant) throw new Error("Participante não encontrado nesta empresa.");
      const duplicate = store.registrations.find((r) => r.eventId === input.eventId && r.participantId === input.participantId);
      if (duplicate) throw new Error("Este participante já está inscrito neste evento.");
      const registration: EventRegistration = {
        id: nextId("registration"),
        companyId,
        status: "solicitada",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input,
      };
      store.registrations.push(registration);
      pushAudit(session, {
        acao: "criacao",
        entidade: "inscricao",
        entidadeId: registration.id,
        descricao: `Inscrição de "${participant.nome}" registrada para o evento.`,
      });
      return registration;
    },
    async updateStatus(session, id, status) {
      assertCan(session.perfil, "manage_registrations");
      const store = getStore();
      const companyId = requireCompany(session);
      const registration = store.registrations.find((r) => r.id === id && r.companyId === companyId);
      if (!registration) throw new Error("Inscrição não encontrada.");
      registration.status = status;
      registration.updatedAt = nowIso();
      pushAudit(session, { acao: "edicao", entidade: "inscricao", entidadeId: registration.id, descricao: `Inscrição atualizada para status ${status}.` });
      return registration;
    },
    async checkIn(session, id) {
      assertCan(session.perfil, "manage_registrations");
      const store = getStore();
      const companyId = requireCompany(session);
      const registration = store.registrations.find((r) => r.id === id && r.companyId === companyId);
      if (!registration) throw new Error("Inscrição não encontrada.");
      if (registration.status !== "confirmada") throw new Error("Inscrição precisa estar confirmada para registrar check-in.");
      registration.checkInAt = nowIso();
      registration.checkInPorId = session.userId;
      registration.updatedAt = nowIso();
      pushAudit(session, { acao: "edicao", entidade: "credenciamento", entidadeId: registration.id, descricao: "Check-in registrado." });
      return registration;
    },
    async undoCheckIn(session, id) {
      assertCan(session.perfil, "manage_registrations");
      const store = getStore();
      const companyId = requireCompany(session);
      const registration = store.registrations.find((r) => r.id === id && r.companyId === companyId);
      if (!registration) throw new Error("Inscrição não encontrada.");
      registration.checkInAt = undefined;
      registration.checkInPorId = undefined;
      registration.updatedAt = nowIso();
      pushAudit(session, { acao: "edicao", entidade: "credenciamento", entidadeId: registration.id, descricao: "Check-in desfeito." });
      return registration;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_registrations");
      const store = getStore();
      const companyId = requireCompany(session);
      store.registrations = store.registrations.filter((r) => !(r.id === id && r.companyId === companyId));
    },
  },

  schedule: {
    async listByEvent(session, eventId) {
      const store = getStore();
      const companyId = requireCompany(session);
      return store.scheduleItems
        .filter((i) => i.eventId === eventId && i.companyId === companyId)
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_schedule");
      const store = getStore();
      const companyId = requireCompany(session);
      const event = store.events.find((e) => e.id === input.eventId && e.companyId === companyId);
      if (!event) throw new Error("Evento não encontrado.");
      if (input.responsavelId) {
        const responsavel = store.users.find((u) => u.id === input.responsavelId && u.companyId === companyId);
        if (!responsavel) throw new Error("Responsável inválido para esta empresa.");
      }
      if (input.dependeDeId) {
        const dependency = store.scheduleItems.find((i) => i.id === input.dependeDeId && i.eventId === input.eventId);
        if (!dependency) throw new Error("Atividade de dependência não encontrada neste evento.");
      }
      if (!(input.fim > input.inicio)) throw new Error("O fim da atividade precisa ser após o início.");
      const item: ScheduleItem = { id: nextId("schedule"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.scheduleItems.push(item);
      pushAudit(session, { acao: "criacao", entidade: "cronograma", entidadeId: item.id, descricao: `Atividade "${item.titulo}" adicionada ao cronograma.` });
      return item;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_schedule");
      const store = getStore();
      const companyId = requireCompany(session);
      const item = store.scheduleItems.find((i) => i.id === id && i.companyId === companyId);
      if (!item) throw new Error("Atividade não encontrada.");
      if (input.responsavelId) {
        const responsavel = store.users.find((u) => u.id === input.responsavelId && u.companyId === companyId);
        if (!responsavel) throw new Error("Responsável inválido para esta empresa.");
      }
      if (input.dependeDeId) {
        if (input.dependeDeId === id) throw new Error("Uma atividade não pode depender dela mesma.");
        const dependency = store.scheduleItems.find((i) => i.id === input.dependeDeId && i.eventId === item.eventId);
        if (!dependency) throw new Error("Atividade de dependência não encontrada neste evento.");
      }
      const inicio = input.inicio ?? item.inicio;
      const fim = input.fim ?? item.fim;
      if (!(fim > inicio)) throw new Error("O fim da atividade precisa ser após o início.");
      Object.assign(item, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "cronograma", entidadeId: item.id, descricao: `Atividade "${item.titulo}" atualizada.` });
      return item;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_schedule");
      const store = getStore();
      const companyId = requireCompany(session);
      // Atividades que dependiam desta ficam sem dependência, em vez de
      // manter uma referência solta a um id removido.
      for (const other of store.scheduleItems) {
        if (other.dependeDeId === id) other.dependeDeId = undefined;
      }
      store.scheduleItems = store.scheduleItems.filter((i) => !(i.id === id && i.companyId === companyId));
    },
  },

  documents: {
    async listByEvent(session, eventId, options) {
      const store = getStore();
      const companyId = requireCompany(session);
      let items = store.documents.filter((d) => d.eventId === eventId && d.companyId === companyId);
      if (!options?.includeArchived) items = items.filter((d) => d.status === "ativo");
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_documents");
      const store = getStore();
      const companyId = requireCompany(session);
      const event = store.events.find((e) => e.id === input.eventId && e.companyId === companyId);
      if (!event) throw new Error("Evento não encontrado.");
      const responsavel = store.users.find((u) => u.id === input.responsavelId && u.companyId === companyId);
      if (!responsavel) throw new Error("Responsável inválido para esta empresa.");
      const document: EventDocument = {
        id: nextId("document"),
        companyId,
        status: "ativo",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input,
      };
      store.documents.push(document);
      pushAudit(session, { acao: "criacao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" registrado.` });
      return document;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_documents");
      const store = getStore();
      const companyId = requireCompany(session);
      const document = store.documents.find((d) => d.id === id && d.companyId === companyId);
      if (!document) throw new Error("Documento não encontrado.");
      if (input.responsavelId) {
        const responsavel = store.users.find((u) => u.id === input.responsavelId && u.companyId === companyId);
        if (!responsavel) throw new Error("Responsável inválido para esta empresa.");
      }
      Object.assign(document, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" atualizado.` });
      return document;
    },
    async archive(session, id) {
      assertCan(session.perfil, "manage_documents");
      const store = getStore();
      const companyId = requireCompany(session);
      const document = store.documents.find((d) => d.id === id && d.companyId === companyId);
      if (!document) throw new Error("Documento não encontrado.");
      document.status = "arquivado";
      document.arquivadoEm = nowIso();
      document.updatedAt = nowIso();
      pushAudit(session, { acao: "edicao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" arquivado.` });
      return document;
    },
    async restore(session, id) {
      assertCan(session.perfil, "manage_documents");
      const store = getStore();
      const companyId = requireCompany(session);
      const document = store.documents.find((d) => d.id === id && d.companyId === companyId);
      if (!document) throw new Error("Documento não encontrado.");
      document.status = "ativo";
      document.arquivadoEm = undefined;
      document.updatedAt = nowIso();
      pushAudit(session, { acao: "edicao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" restaurado.` });
      return document;
    },
  },

  budget: {
    async getByEvent(session, eventId) {
      // Valores financeiros só podem ser lidos por quem tem
      // "view_financials" — a UI já evita chamar isto para outros
      // perfis, mas o backend não pode depender só disso (o cliente de
      // serviço do Supabase ignora RLS; aqui, em memória, a única
      // defesa é esta checagem).
      assertCan(session.perfil, "view_financials");
      const store = getStore();
      const companyId = requireCompany(session);
      return store.budgets.find((b) => b.eventId === eventId && b.companyId === companyId) ?? null;
    },
    async upsert(session, eventId, input) {
      assertCan(session.perfil, "manage_budget");
      const store = getStore();
      const companyId = requireCompany(session);
      let budget = store.budgets.find((b) => b.eventId === eventId && b.companyId === companyId);
      if (budget) {
        Object.assign(budget, input, { updatedAt: nowIso() });
      } else {
        budget = { id: nextId("budget"), companyId, eventId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
        store.budgets.push(budget);
      }
      const event = store.events.find((e) => e.id === eventId);
      if (event) event.previstoOrcamento = true;
      pushAudit(session, { acao: "edicao", entidade: "orcamento", entidadeId: budget.id, descricao: `Orçamento previsto do evento atualizado.` });
      return budget;
    },
  },

  budgetItems: {
    async listByEvent(session, eventId) {
      // Mesma proteção de budget.getByEvent — itens de orçamento também
      // são valor financeiro, atrás de "view_financials".
      assertCan(session.perfil, "view_financials");
      const store = getStore();
      const companyId = requireCompany(session);
      return store.budgetItems
        .filter((i) => i.eventId === eventId && i.companyId === companyId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_budget");
      const store = getStore();
      const companyId = requireCompany(session);
      const event = store.events.find((e) => e.id === input.eventId && e.companyId === companyId);
      if (!event) throw new Error("Evento não encontrado.");
      if (input.supplierId) {
        const supplier = store.suppliers.find((s) => s.id === input.supplierId && s.companyId === companyId);
        if (!supplier) throw new Error("Fornecedor não encontrado nesta empresa.");
      }
      for (const [label, value] of [
        ["cotado", input.valorCotado],
        ["contratado", input.valorContratado],
        ["realizado", input.valorRealizado],
      ] as const) {
        if (value != null && value < 0) throw new Error(`Valor ${label} não pode ser negativo.`);
      }
      const item: BudgetItem = { id: nextId("budget_item"), companyId, createdAt: nowIso(), updatedAt: nowIso(), ...input };
      store.budgetItems.push(item);
      pushAudit(session, { acao: "criacao", entidade: "orcamento_item", entidadeId: item.id, descricao: `Item de orçamento "${item.descricao}" criado.` });
      return item;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_budget");
      const store = getStore();
      const companyId = requireCompany(session);
      const item = store.budgetItems.find((i) => i.id === id && i.companyId === companyId);
      if (!item) throw new Error("Item de orçamento não encontrado.");
      if (input.supplierId) {
        const supplier = store.suppliers.find((s) => s.id === input.supplierId && s.companyId === companyId);
        if (!supplier) throw new Error("Fornecedor não encontrado nesta empresa.");
      }
      for (const [label, value] of [
        ["cotado", input.valorCotado],
        ["contratado", input.valorContratado],
        ["realizado", input.valorRealizado],
      ] as const) {
        if (value != null && value < 0) throw new Error(`Valor ${label} não pode ser negativo.`);
      }
      Object.assign(item, input, { updatedAt: nowIso() });
      pushAudit(session, { acao: "edicao", entidade: "orcamento_item", entidadeId: item.id, descricao: `Item de orçamento "${item.descricao}" atualizado.` });
      return item;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_budget");
      const store = getStore();
      const companyId = requireCompany(session);
      store.budgetItems = store.budgetItems.filter((i) => !(i.id === id && i.companyId === companyId));
    },
  },

  complexity: {
    async getLatestByEvent(session, eventId) {
      const store = getStore();
      const companyId = requireCompany(session);
      const items = store.complexityAssessments.filter((c) => c.eventId === eventId && c.companyId === companyId);
      if (items.length === 0) return null;
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    },
    async assess(session, eventId, factors) {
      assertCan(session.perfil, "assess_complexity");
      const store = getStore();
      const companyId = requireCompany(session);
      const result = calculateComplexity(factors);
      const assessment: ComplexityAssessment = {
        id: nextId("complexity"),
        companyId,
        eventId,
        fatores: factors,
        esforco: result.esforco,
        impacto: result.impacto,
        pontuacao: result.pontuacao,
        nivel: result.nivel,
        createdAt: nowIso(),
      };
      store.complexityAssessments.push(assessment);
      pushAudit(session, {
        acao: "edicao",
        entidade: "complexidade",
        entidadeId: assessment.id,
        descricao: `Complexidade recalculada: ${COMPLEXITY_LEVEL_LABELS[assessment.nivel]} (pontuação ${assessment.pontuacao}).`,
      });
      return assessment;
    },
  },

  audit: {
    async list(session, filters) {
      assertCan(session.perfil, "view_audit");
      const store = getStore();
      let items = scoped(session, store.auditLogs);
      if (filters?.entidade) items = items.filter((a) => a.entidade === filters.entidade);
      if (filters?.acao) items = items.filter((a) => a.acao === filters.acao);
      if (filters?.dataInicial) items = items.filter((a) => a.createdAt >= filters.dataInicial!);
      if (filters?.dataFinal) items = items.filter((a) => a.createdAt <= filters.dataFinal!);
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async record(session, entry) {
      pushAudit(session, entry);
      const store = getStore();
      return store.auditLogs[store.auditLogs.length - 1];
    },
  },

  dashboard: {
    async get(session, period): Promise<DashboardData> {
      const store = getStore();
      const companyId = requireCompany(session);
      const events = store.events.filter((e) => e.companyId === companyId);
      const inPeriod = period
        ? events.filter((e) => {
            const start = getEventMainStart(store, e.id);
            return start >= period.from && start <= period.to;
          })
        : events;

      const reservations = store.reservations.filter((r) => r.companyId === companyId);
      const complexityByEvent = new Map(
        store.complexityAssessments
          .filter((c) => c.companyId === companyId)
          .map((c) => [c.eventId, c] as const),
      );
      const budgetEventIds = new Set(store.budgets.filter((b) => b.companyId === companyId).map((b) => b.eventId));

      const eventosPorStatus: Record<string, number> = {};
      const eventosPorCategoria: Record<string, number> = {};
      const eventosPorComplexidade: Record<string, number> = {};
      let eventosEstrategicos = 0;
      let eventosComOrcamento = 0;
      let eventosSemOrcamento = 0;

      for (const e of inPeriod) {
        eventosPorStatus[e.status] = (eventosPorStatus[e.status] ?? 0) + 1;
        eventosPorCategoria[e.categoria] = (eventosPorCategoria[e.categoria] ?? 0) + 1;
        const nivel = complexityByEvent.get(e.id)?.nivel ?? "n/a";
        eventosPorComplexidade[nivel] = (eventosPorComplexidade[nivel] ?? 0) + 1;
        if (e.estrategico) eventosEstrategicos += 1;
        if (e.previstoOrcamento || budgetEventIds.has(e.id)) eventosComOrcamento += 1;
        else eventosSemOrcamento += 1;
      }

      const reservasPorStatus: Record<string, number> = {};
      for (const r of reservations) {
        reservasPorStatus[r.status] = (reservasPorStatus[r.status] ?? 0) + 1;
      }

      const spaces = store.spaces.filter((s) => s.companyId === companyId);
      const now = Date.now();
      const horizonDays = 30;
      const ocupacaoEspacos = spaces.map((s) => {
        const relevant = reservations.filter(
          (r) => r.spaceId === s.id && r.status !== "cancelada" && new Date(r.inicio).getTime() >= now,
        );
        const horasReservadas = relevant.reduce(
          (sum, r) => sum + (new Date(r.fim).getTime() - new Date(r.inicio).getTime()) / 3_600_000,
          0,
        );
        const horasDisponiveis = horizonDays * 10; // 10h úteis/dia, aproximação para o indicador
        return {
          spaceId: s.id,
          nome: s.nome,
          percentual: Math.min(100, Math.round((horasReservadas / horasDisponiveis) * 100)),
        };
      });

      const proximosEventos = events
        .filter((e) => getEventMainStart(store, e.id) >= new Date().toISOString() && e.status !== "cancelado")
        .sort((a, b) => getEventMainStart(store, a.id).localeCompare(getEventMainStart(store, b.id)))
        .slice(0, 6);

      return {
        totalEventos: inPeriod.length,
        proximosEventos,
        eventosPorStatus,
        eventosPorCategoria,
        eventosPorComplexidade,
        eventosEstrategicos,
        reservasPorStatus,
        eventosComOrcamento,
        eventosSemOrcamento,
        ocupacaoEspacos,
      };
    },
  },

  notifications: {
    async list(session) {
      const store = getStore();
      const companyId = requireCompany(session);
      // Orçamento excedido só é computado para quem tem "view_financials"
      // — mesma proteção de budget.getByEvent/budgetItems.listByEvent
      // (fatia 4a): a consulta nem roda para quem não tem a capability.
      const canFinancials = can(session.perfil, "view_financials");
      const nowMs = Date.now();
      const DAY_MS = 24 * 3600_000;
      const RECENCY_MS = 7 * DAY_MS;
      const PRAZO_CHECKLIST_MS = 3 * DAY_MS;
      const PRAZO_SCHEDULE_MS = DAY_MS;

      const events = store.events.filter((e) => e.companyId === companyId);
      const eventById = new Map(events.map((e) => [e.id, e]));
      // Eventos cancelados/concluídos não geram alertas operacionais novos
      // (prazo, bloqueio, documento pendente) — só histórico de mudança de
      // status e reserva alterada olham para trás independente do status
      // atual, já que a própria transição é o fato notável.
      const openEventIds = new Set(
        events.filter((e) => e.status !== "cancelado" && e.status !== "concluido").map((e) => e.id),
      );

      const items: NotificationItem[] = [];
      let seq = 0;
      const push = (n: Omit<NotificationItem, "id">) => items.push({ id: `notif_${seq++}`, ...n });

      // Checklist: prazo próximo + tarefa atrasada
      for (const c of store.checklistItems) {
        if (c.companyId !== companyId || !c.prazo || !openEventIds.has(c.eventId)) continue;
        if (c.status === "concluido" || c.status === "cancelado") continue;
        const event = eventById.get(c.eventId);
        if (!event) continue;
        const prazoMs = new Date(c.prazo).getTime();
        if (prazoMs < nowMs) {
          push({
            type: "tarefa_atrasada",
            severity: "danger",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Item de checklist atrasado: "${c.titulo}"`,
            referenceAt: c.prazo,
          });
        } else if (prazoMs - nowMs <= PRAZO_CHECKLIST_MS) {
          push({
            type: "prazo_proximo",
            severity: "warning",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Prazo próximo no checklist: "${c.titulo}"`,
            referenceAt: c.prazo,
          });
        }
      }

      // Checklist: atividade bloqueada
      for (const c of store.checklistItems) {
        if (c.companyId !== companyId || c.status !== "bloqueado" || !openEventIds.has(c.eventId)) continue;
        const event = eventById.get(c.eventId);
        if (!event) continue;
        push({
          type: "atividade_bloqueada",
          severity: "danger",
          eventId: event.id,
          eventTitulo: event.titulo,
          titulo: `Item de checklist bloqueado: "${c.titulo}"`,
          referenceAt: c.updatedAt,
        });
      }

      // Cronograma: prazo próximo + atividade atrasada
      for (const s of store.scheduleItems) {
        if (s.companyId !== companyId || !openEventIds.has(s.eventId)) continue;
        if (s.status === "concluido" || s.status === "cancelado") continue;
        const event = eventById.get(s.eventId);
        if (!event) continue;
        const fimMs = new Date(s.fim).getTime();
        const inicioMs = new Date(s.inicio).getTime();
        if (fimMs < nowMs) {
          push({
            type: "tarefa_atrasada",
            severity: "danger",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Atividade do cronograma atrasada: "${s.titulo}"`,
            referenceAt: s.fim,
          });
        } else if (inicioMs >= nowMs && inicioMs - nowMs <= PRAZO_SCHEDULE_MS) {
          push({
            type: "prazo_proximo",
            severity: "warning",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Atividade próxima no cronograma: "${s.titulo}"`,
            referenceAt: s.inicio,
          });
        }
      }

      // Documentos: evento aberto sem nenhum documento ativo registrado
      const activeDocEventIds = new Set(
        store.documents.filter((d) => d.companyId === companyId && d.status === "ativo").map((d) => d.eventId),
      );
      for (const eventId of openEventIds) {
        if (activeDocEventIds.has(eventId)) continue;
        const event = eventById.get(eventId);
        if (!event) continue;
        push({
          type: "documento_pendente",
          severity: "info",
          eventId: event.id,
          eventTitulo: event.titulo,
          titulo: "Nenhum documento registrado para este evento",
          referenceAt: event.updatedAt,
        });
      }

      // Reservas alteradas recentemente (updatedAt != createdAt é o único
      // sinal de edição disponível no modelo atual — sem log de campo a
      // campo, tratamos qualquer atualização após a criação como "alterada").
      for (const r of store.reservations) {
        if (r.companyId !== companyId || !r.eventId || !openEventIds.has(r.eventId)) continue;
        if (r.updatedAt === r.createdAt) continue;
        if (nowMs - new Date(r.updatedAt).getTime() > RECENCY_MS) continue;
        const event = eventById.get(r.eventId);
        if (!event) continue;
        push({
          type: "reserva_alterada",
          severity: "info",
          eventId: event.id,
          eventTitulo: event.titulo,
          titulo: `Reserva alterada (status atual: ${RESERVATION_STATUS_LABELS[r.status]})`,
          referenceAt: r.updatedAt,
        });
      }

      // Mudança relevante de status (histórico já existente de
      // event_status_history) — ignora a transição inicial (criação do
      // evento, statusAnterior null), que não é uma "mudança".
      for (const h of store.statusHistory) {
        if (h.companyId !== companyId || h.statusAnterior === null) continue;
        if (nowMs - new Date(h.createdAt).getTime() > RECENCY_MS) continue;
        const event = eventById.get(h.eventId);
        if (!event) continue;
        push({
          type: "mudanca_status",
          severity: "info",
          eventId: event.id,
          eventTitulo: event.titulo,
          titulo: `Status alterado de "${EVENT_STATUS_LABELS[h.statusAnterior]}" para "${EVENT_STATUS_LABELS[h.statusNovo]}"`,
          referenceAt: h.createdAt,
        });
      }

      // Orçamento excedido (comprometido/realizado acima do previsto) —
      // mesmo raciocínio de Comprometido/Realizado da aba Orçamento
      // (fatia 4a): soma só valor_contratado/valor_realizado, nunca cotado.
      if (canFinancials) {
        for (const eventId of openEventIds) {
          const budget = store.budgets.find((b) => b.eventId === eventId && b.companyId === companyId);
          if (!budget) continue;
          const activeItems = store.budgetItems.filter(
            (i) => i.eventId === eventId && i.companyId === companyId && i.status !== "cancelado",
          );
          const comprometido = activeItems.reduce((sum, i) => sum + (i.valorContratado ?? 0), 0);
          const realizado = activeItems.reduce((sum, i) => sum + (i.valorRealizado ?? 0), 0);
          const event = eventById.get(eventId);
          if (!event) continue;
          if (realizado > budget.valorPrevisto) {
            push({
              type: "orcamento_excedido",
              severity: "danger",
              eventId: event.id,
              eventTitulo: event.titulo,
              titulo: "Orçamento realizado ultrapassou o valor previsto",
              referenceAt: budget.updatedAt,
            });
          } else if (comprometido > budget.valorPrevisto) {
            push({
              type: "orcamento_excedido",
              severity: "warning",
              eventId: event.id,
              eventTitulo: event.titulo,
              titulo: "Orçamento comprometido acima do valor previsto",
              referenceAt: budget.updatedAt,
            });
          }
        }
      }

      return items.sort((a, b) => b.referenceAt.localeCompare(a.referenceAt));
    },
  },
};

function getEventMainStart(store: ReturnType<typeof getStore>, eventId: string): string {
  const sessions = store.eventSessions.filter((s) => s.eventId === eventId);
  if (sessions.length === 0) return "";
  return sessions.reduce((min, s) => (s.inicio < min ? s.inicio : min), sessions[0].inicio);
}

export type { EventSearchFilters, ReservationSearchFilters, SpaceSearchFilters, DashboardPeriod };
