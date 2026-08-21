import type {
  AuthSession,
  ComplexityFactors,
  EventSession,
  EventStatus,
  NotificationItem,
  Reservation,
} from "@/lib/domain/types";
import { EVENT_STATUS_LABELS, RESERVATION_STATUS_LABELS, ROLE_LABELS } from "@/lib/domain/types";
import { assertCan, assertCanCreateEvent, can, PermissionError } from "@/lib/domain/permissions";
import { checkAvailability } from "@/lib/domain/availability";
import { calculateComplexity, COMPLEXITY_LEVEL_LABELS } from "@/lib/domain/complexity";
import type { DashboardData, Repository } from "../repository";
import { getSupabaseServiceClient } from "./client";
import {
  eventToRow,
  mapAuditLog,
  mapBudget,
  mapBudgetItem,
  mapChecklistItem,
  mapCompany,
  mapComplexity,
  mapEvent,
  mapEventSession,
  mapEventDocument,
  mapEventRegistration,
  mapEventSupplier,
  mapEventTeamMember,
  mapParticipant,
  mapReservation,
  mapScheduleItem,
  mapSpace,
  mapStatusHistory,
  mapSupplier,
  mapUser,
} from "./mappers";

/**
 * Implementação oficial da camada de dados sobre Supabase/Postgres.
 *
 * Usa a service role no servidor (nunca exposta ao cliente) e replica
 * explicitamente as checagens de `company_id` e de permissão da matriz
 * de `src/lib/domain/permissions.ts`, além de contar com RLS como
 * segunda camada de defesa (supabase/migrations/0002_row_level_security.sql).
 *
 * Ativada apenas quando `DATA_MODE=supabase` e as variáveis de conexão
 * estiverem configuradas — ver docs/architecture/DATABASE.md.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function requireCompany(session: AuthSession): string {
  if (!session.companyId) {
    throw new Error("Sessão sem empresa vinculada não pode operar dados operacionais.");
  }
  return session.companyId;
}

async function recordAudit(
  session: AuthSession,
  entry: { acao: string; entidade: string; entidadeId: string; descricao: string },
) {
  const db = getSupabaseServiceClient();
  const companyId = requireCompany(session);
  await db.from("audit_logs").insert({
    company_id: companyId,
    user_id: session.userId,
    acao: entry.acao,
    entidade: entry.entidade,
    entidade_id: entry.entidadeId,
    descricao: entry.descricao,
  });
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data == null) throw new Error("Registro não encontrado.");
  return res.data;
}

export const supabaseRepository: Repository = {
  companies: {
    async list(session) {
      const db = getSupabaseServiceClient();
      let query = db.from("companies").select("*");
      if (session.perfil !== "superadmin") query = query.eq("id", requireCompany(session));
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapCompany);
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db.from("companies").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      if (session.perfil !== "superadmin" && data.id !== session.companyId) return null;
      return mapCompany(data);
    },
  },

  users: {
    async list(session) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("company_id", requireCompany(session));
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapUser);
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || (session.perfil !== "superadmin" && data.company_id !== session.companyId)) return null;
      return mapUser(data);
    },
    async getByEmail(email) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db.from("profiles").select("*").ilike("email", email).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapUser(data) : null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_company_users");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("profiles")
          .insert({
            company_id: companyId,
            nome: input.nome,
            email: input.email,
            perfil: input.perfil,
            status: input.status,
            avatar_color: input.avatarColor,
          })
          .select("*")
          .single(),
      );
      const user = mapUser(row);
      await recordAudit(session, { acao: "administrativo", entidade: "usuario", entidadeId: user.id, descricao: `Usuário "${user.nome}" criado com perfil ${ROLE_LABELS[user.perfil]}.` });
      return user;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_company_users");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("profiles")
          .update({ nome: input.nome, perfil: input.perfil, status: input.status })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const user = mapUser(row);
      await recordAudit(session, { acao: "administrativo", entidade: "usuario", entidadeId: user.id, descricao: `Usuário "${user.nome}" atualizado.` });
      return user;
    },
  },

  spaces: {
    async list(session, filters) {
      const db = getSupabaseServiceClient();
      let query = db.from("spaces").select("*").eq("company_id", requireCompany(session));
      if (filters?.local) query = query.ilike("local", `%${filters.local}%`);
      if (filters?.nome) query = query.ilike("nome", `%${filters.nome}%`);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.capacidadeMinima != null) query = query.gte("capacidade", filters.capacidadeMinima);
      const { data, error } = await query.order("nome");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapSpace);
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("spaces")
        .select("*")
        .eq("id", id)
        .eq("company_id", requireCompany(session))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapSpace(data) : null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_spaces");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("spaces")
          .insert({
            company_id: companyId,
            nome: input.nome,
            local: input.local,
            capacidade: input.capacidade,
            status: input.status,
            descricao: input.descricao,
            caracteristicas: input.caracteristicas,
            equipamentos: input.equipamentos,
            observacoes: input.observacoes,
          })
          .select("*")
          .single(),
      );
      const space = mapSpace(row);
      await recordAudit(session, { acao: "criacao", entidade: "espaco", entidadeId: space.id, descricao: `Espaço "${space.nome}" criado.` });
      return space;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_spaces");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const patch: Record<string, unknown> = {};
      if (input.nome !== undefined) patch.nome = input.nome;
      if (input.local !== undefined) patch.local = input.local;
      if (input.capacidade !== undefined) patch.capacidade = input.capacidade;
      if (input.status !== undefined) patch.status = input.status;
      if (input.descricao !== undefined) patch.descricao = input.descricao;
      if (input.caracteristicas !== undefined) patch.caracteristicas = input.caracteristicas;
      if (input.equipamentos !== undefined) patch.equipamentos = input.equipamentos;
      if (input.observacoes !== undefined) patch.observacoes = input.observacoes;
      const row = unwrap<Row>(
        await db.from("spaces").update(patch).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const space = mapSpace(row);
      await recordAudit(session, { acao: "edicao", entidade: "espaco", entidadeId: space.id, descricao: `Espaço "${space.nome}" editado.` });
      return space;
    },
    async setStatus(session, id, status) {
      assertCan(session.perfil, "manage_spaces");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db.from("spaces").update({ status }).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const space = mapSpace(row);
      await recordAudit(session, { acao: status === "inativo" ? "cancelamento" : "edicao", entidade: "espaco", entidadeId: space.id, descricao: `Espaço "${space.nome}" marcado como ${status === "inativo" ? "inativo" : "ativo"}.` });
      return space;
    },
  },

  reservations: {
    async list(session, filters) {
      const db = getSupabaseServiceClient();
      let query = db.from("reservations").select("*").eq("company_id", requireCompany(session));
      if (filters?.spaceId) query = query.eq("space_id", filters.spaceId);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.eventId !== undefined) {
        query = filters.eventId === null ? query.is("event_id", null) : query.eq("event_id", filters.eventId);
      }
      if (filters?.dataInicial) query = query.gte("inicio", filters.dataInicial);
      if (filters?.dataFinal) query = query.lte("inicio", filters.dataFinal);
      const { data, error } = await query.order("inicio");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapReservation);
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("reservations")
        .select("*")
        .eq("id", id)
        .eq("company_id", requireCompany(session))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapReservation(data) : null;
    },
    async checkAvailability(session, input) {
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { data: spaceRow, error: spaceError } = await db
        .from("spaces")
        .select("*")
        .eq("id", input.spaceId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (spaceError) throw new Error(spaceError.message);
      if (!spaceRow) return { available: false, issues: [{ code: "espaco_inativo", message: "Espaço não encontrado." }] };

      const { data: existingRows, error: resError } = await db
        .from("reservations")
        .select("*")
        .eq("company_id", companyId)
        .eq("space_id", input.spaceId);
      if (resError) throw new Error(resError.message);

      const result = checkAvailability({
        space: mapSpace(spaceRow),
        inicio: input.inicio,
        fim: input.fim,
        quantidadePessoas: input.quantidadePessoas,
        existingReservations: (existingRows ?? []).map(mapReservation),
        ignoreReservationId: input.ignoreReservationId,
      });
      return { available: result.available, issues: result.issues };
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_reservations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);

      const { data: spaceRow, error: spaceError } = await db
        .from("spaces")
        .select("*")
        .eq("id", input.spaceId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (spaceError) throw new Error(spaceError.message);
      if (!spaceRow) throw new Error("Espaço não encontrado.");

      const { data: existingRows, error: resError } = await db
        .from("reservations")
        .select("*")
        .eq("company_id", companyId)
        .eq("space_id", input.spaceId);
      if (resError) throw new Error(resError.message);

      const availability = checkAvailability({
        space: mapSpace(spaceRow),
        inicio: input.inicio,
        fim: input.fim,
        quantidadePessoas: input.quantidadePessoas,
        existingReservations: (existingRows ?? []).map(mapReservation),
      });
      if (!availability.available) {
        throw new Error(availability.issues.map((i) => i.message).join(" "));
      }

      const row = unwrap<Row>(
        await db
          .from("reservations")
          .insert({
            company_id: companyId,
            event_id: input.eventId ?? null,
            space_id: input.spaceId,
            inicio: input.inicio,
            fim: input.fim,
            quantidade_pessoas: input.quantidadePessoas,
            motivo: input.motivo,
            status: "confirmada",
            solicitante_id: input.solicitanteId,
          })
          .select("*")
          .single(),
      );
      const reservation = mapReservation(row);
      await recordAudit(session, { acao: "reserva", entidade: "reserva", entidadeId: reservation.id, descricao: `Reserva do espaço "${spaceRow.nome}" criada (${input.motivo}).` });
      return reservation;
    },
    async updateStatus(session, id, status) {
      assertCan(session.perfil, "manage_reservations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db.from("reservations").update({ status }).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const reservation = mapReservation(row);
      await recordAudit(session, { acao: status === "cancelada" ? "cancelamento" : "edicao", entidade: "reserva", entidadeId: reservation.id, descricao: `Reserva atualizada para status ${RESERVATION_STATUS_LABELS[status]}.` });
      return reservation;
    },
    async linkToEvent(session, id, eventId) {
      assertCan(session.perfil, "manage_reservations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("reservations")
          .update({ event_id: eventId })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const reservation = mapReservation(row);
      await recordAudit(session, { acao: "edicao", entidade: "reserva", entidadeId: reservation.id, descricao: `Reserva vinculada ao evento ${eventId}.` });
      return reservation;
    },
  },

  events: {
    async search(session, filters) {
      const db = getSupabaseServiceClient();
      let query = db.from("events").select("*").eq("company_id", requireCompany(session));
      if (filters.texto) query = query.ilike("titulo", `%${filters.texto}%`);
      if (filters.demandante) query = query.ilike("demandante", `%${filters.demandante}%`);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.spaceId) query = query.eq("space_id", filters.spaceId);
      if (filters.tematica) query = query.eq("tematica", filters.tematica);
      if (filters.estrategico != null) query = query.eq("estrategico", filters.estrategico);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      let events = (data ?? []).map(mapEvent);

      if (filters.complexidade) {
        const { data: cData } = await db
          .from("complexity_assessments")
          .select("event_id, nivel, created_at")
          .in("event_id", events.map((e) => e.id));
        const latestByEvent = new Map<string, string>();
        for (const row of cData ?? []) {
          const prev = latestByEvent.get(row.event_id);
          if (!prev) latestByEvent.set(row.event_id, row.nivel);
        }
        events = events.filter((e) => latestByEvent.get(e.id) === filters.complexidade);
      }
      return events;
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("events")
        .select("*")
        .eq("id", id)
        .eq("company_id", requireCompany(session))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapEvent(data) : null;
    },
    async listUpcoming(session, limit = 5) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("events")
        .select("*")
        .eq("company_id", requireCompany(session))
        .neq("status", "cancelado")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEvent);
    },
    async listForAgenda(session, range) {
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { data: sessionsData, error: sessionsError } = await db
        .from("event_sessions")
        .select("*, events!inner(*)")
        .lte("inicio", range.to)
        .gte("fim", range.from)
        .eq("events.company_id", companyId);
      if (sessionsError) throw new Error(sessionsError.message);

      const grouped = new Map<string, { event: ReturnType<typeof mapEvent>; sessions: EventSession[] }>();
      for (const row of sessionsData ?? []) {
        const eventRow = (row as Record<string, unknown>).events as Record<string, unknown>;
        const eventId = eventRow.id as string;
        const entry = grouped.get(eventId) ?? { event: mapEvent(eventRow), sessions: [] };
        entry.sessions.push(mapEventSession(row));
        grouped.set(eventId, entry);
      }
      return Array.from(grouped.values());
    },
    async create(session, input, sessions) {
      assertCanCreateEvent(session.perfil);
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("events")
          .insert({
            ...eventToRow({ ...input, companyId }),
            created_by: session.userId,
            updated_by: session.userId,
          })
          .select("*")
          .single(),
      );
      const event = mapEvent(row);

      if (sessions.length > 0) {
        await db.from("event_sessions").insert(
          sessions.map((s) => ({ event_id: event.id, inicio: s.inicio, fim: s.fim, observacao: s.observacao })),
        );
      }
      await db.from("event_status_history").insert({
        company_id: companyId,
        event_id: event.id,
        status_anterior: null,
        status_novo: event.status,
        user_id: session.userId,
      });
      await recordAudit(session, { acao: "criacao", entidade: "evento", entidadeId: event.id, descricao: `Evento "${event.titulo}" criado.` });
      return event;
    },
    async update(session, id, input) {
      await assertCanEditEvent(session, id);
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("events")
          .update({ ...eventToRow(input), updated_by: session.userId })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const event = mapEvent(row);
      await recordAudit(session, { acao: "edicao", entidade: "evento", entidadeId: event.id, descricao: `Evento "${event.titulo}" editado.` });
      return event;
    },
    async updateStatus(session, id, status) {
      return updateEventStatus(session, id, status, "alteracao_status");
    },
    async cancel(session, id) {
      assertCan(session.perfil, "cancel_delete_event");
      return updateEventStatus(session, id, "cancelado", "cancelamento");
    },
    async getSessions(session, eventId) {
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("event_sessions")
        .select("*")
        .eq("event_id", eventId)
        .order("inicio");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEventSession);
    },
    async replaceSessions(session, eventId, sessions) {
      await assertCanEditEvent(session, eventId);
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      await db.from("event_sessions").delete().eq("event_id", eventId);
      if (sessions.length === 0) return [];
      const { data, error } = await db
        .from("event_sessions")
        .insert(sessions.map((s) => ({ event_id: eventId, inicio: s.inicio, fim: s.fim, observacao: s.observacao })))
        .select("*");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEventSession);
    },
    async getStatusHistory(session, eventId) {
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("event_status_history")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapStatusHistory);
    },
  },

  checklist: {
    async listByEvent(session, eventId) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("checklist_items")
        .select("*")
        .eq("event_id", eventId)
        .eq("company_id", requireCompany(session))
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapChecklistItem);
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_checklist");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("checklist_items")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            titulo: input.titulo,
            categoria: input.categoria,
            responsavel_id: input.responsavelId,
            prazo: input.prazo,
            status: input.status,
            observacao: input.observacao,
          })
          .select("*")
          .single(),
      );
      const item = mapChecklistItem(row);
      await recordAudit(session, { acao: "criacao", entidade: "checklist", entidadeId: item.id, descricao: `Item de checklist "${item.titulo}" criado.` });
      return item;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_checklist");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const patch: Record<string, unknown> = { ...input };
      if (input.responsavelId !== undefined) {
        patch.responsavel_id = input.responsavelId;
        delete patch.responsavelId;
      }
      if (input.status === "concluido") patch.concluido_em = new Date().toISOString();
      const row = unwrap<Row>(
        await db.from("checklist_items").update(patch).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const item = mapChecklistItem(row);
      await recordAudit(session, { acao: "edicao", entidade: "checklist", entidadeId: item.id, descricao: `Item de checklist "${item.titulo}" atualizado.` });
      return item;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_checklist");
      const db = getSupabaseServiceClient();
      await db.from("checklist_items").delete().eq("id", id).eq("company_id", requireCompany(session));
    },
  },

  suppliers: {
    async list(session, filters) {
      const db = getSupabaseServiceClient();
      let query = db.from("suppliers").select("*").eq("company_id", requireCompany(session));
      if (filters?.nome) query = query.ilike("nome", `%${filters.nome}%`);
      if (filters?.categoria) query = query.eq("categoria", filters.categoria);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query.order("nome");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapSupplier);
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .eq("company_id", requireCompany(session))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapSupplier(data) : null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_suppliers");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("suppliers")
          .insert({
            company_id: companyId,
            nome: input.nome,
            documento: input.documento,
            categoria: input.categoria,
            contato: input.contato,
            servicos: input.servicos,
            status: input.status,
            observacoes: input.observacoes,
          })
          .select("*")
          .single(),
      );
      const supplier = mapSupplier(row);
      await recordAudit(session, { acao: "criacao", entidade: "fornecedor", entidadeId: supplier.id, descricao: `Fornecedor "${supplier.nome}" cadastrado.` });
      return supplier;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_suppliers");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("suppliers")
          .update({
            nome: input.nome,
            documento: input.documento,
            categoria: input.categoria,
            contato: input.contato,
            servicos: input.servicos,
            status: input.status,
            observacoes: input.observacoes,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const supplier = mapSupplier(row);
      await recordAudit(session, { acao: "edicao", entidade: "fornecedor", entidadeId: supplier.id, descricao: `Fornecedor "${supplier.nome}" editado.` });
      return supplier;
    },
    async setStatus(session, id, status) {
      assertCan(session.perfil, "manage_suppliers");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db.from("suppliers").update({ status }).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const supplier = mapSupplier(row);
      await recordAudit(session, {
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
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("event_suppliers")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      // Valores previsto/contratado vivem em event_supplier_financials,
      // com RLS própria (Gestor/Admin). O cliente de serviço ignora RLS,
      // então a checagem de "view_financials" é replicada aqui: quem não
      // tem a capability nunca chega a buscar/receber os valores.
      let financialsById = new Map<string, Row>();
      if (can(session.perfil, "view_financials") && rows.length > 0) {
        const { data: fin, error: finError } = await db
          .from("event_supplier_financials")
          .select("*")
          .in(
            "event_supplier_id",
            rows.map((r) => r.id),
          );
        if (finError) throw new Error(finError.message);
        financialsById = new Map((fin ?? []).map((f) => [f.event_supplier_id, f]));
      }
      return rows.map((r) => mapEventSupplier(r, financialsById.get(r.id)));
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_suppliers");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      // RN01: evento, fornecedor e responsável interno precisam
      // pertencer à mesma empresa da sessão. O cliente de serviço ignora
      // RLS, então essa validação precisa acontecer aqui — a UI só
      // oferece opções corretas, mas isso não protege uma requisição
      // manipulada diretamente.
      await assertEventInCompany(session, input.eventId);
      const { data: supplierRow, error: supplierError } = await db
        .from("suppliers")
        .select("id, nome")
        .eq("id", input.supplierId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (supplierError) throw new Error(supplierError.message);
      if (!supplierRow) throw new Error("Fornecedor não encontrado nesta empresa.");
      if (input.responsavelInternoId) {
        const { data: userRow, error: userError } = await db
          .from("profiles")
          .select("id")
          .eq("id", input.responsavelInternoId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (userError) throw new Error(userError.message);
        if (!userRow) throw new Error("Responsável interno inválido para esta empresa.");
      }
      if (input.valorPrevisto != null && input.valorPrevisto < 0) throw new Error("Valor previsto não pode ser negativo.");
      if (input.valorContratado != null && input.valorContratado < 0) throw new Error("Valor contratado não pode ser negativo.");

      const row = unwrap<Row>(
        await db
          .from("event_suppliers")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            supplier_id: input.supplierId,
            servico: input.servico,
            responsavel_interno_id: input.responsavelInternoId,
            situacao: input.situacao,
            data_inicio: input.dataInicio,
            data_fim: input.dataFim,
            observacoes: input.observacoes,
          })
          .select("*")
          .single(),
      );
      let financialsRow: Row | null = null;
      if (input.valorPrevisto != null || input.valorContratado != null) {
        financialsRow = unwrap<Row>(
          await db
            .from("event_supplier_financials")
            .insert({
              event_supplier_id: row.id,
              company_id: companyId,
              valor_previsto: input.valorPrevisto,
              valor_contratado: input.valorContratado,
            })
            .select("*")
            .single(),
        );
      }
      const link = mapEventSupplier(row, financialsRow);
      await recordAudit(session, { acao: "criacao", entidade: "fornecedor_evento", entidadeId: link.id, descricao: `Fornecedor "${supplierRow.nome}" vinculado ao evento (${link.servico}).` });
      return link;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_suppliers");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      if (input.responsavelInternoId) {
        const { data: userRow, error: userError } = await db
          .from("profiles")
          .select("id")
          .eq("id", input.responsavelInternoId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (userError) throw new Error(userError.message);
        if (!userRow) throw new Error("Responsável interno inválido para esta empresa.");
      }
      if (input.valorPrevisto != null && input.valorPrevisto < 0) throw new Error("Valor previsto não pode ser negativo.");
      if (input.valorContratado != null && input.valorContratado < 0) throw new Error("Valor contratado não pode ser negativo.");

      const row = unwrap<Row>(
        await db
          .from("event_suppliers")
          .update({
            servico: input.servico,
            responsavel_interno_id: input.responsavelInternoId,
            situacao: input.situacao,
            data_inicio: input.dataInicio,
            data_fim: input.dataFim,
            observacoes: input.observacoes,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      let financialsRow: Row | null = null;
      if (input.valorPrevisto !== undefined || input.valorContratado !== undefined) {
        financialsRow = unwrap<Row>(
          await db
            .from("event_supplier_financials")
            .upsert(
              {
                event_supplier_id: id,
                company_id: companyId,
                valor_previsto: input.valorPrevisto,
                valor_contratado: input.valorContratado,
              },
              { onConflict: "event_supplier_id" },
            )
            .select("*")
            .single(),
        );
      }
      const link = mapEventSupplier(row, financialsRow);
      await recordAudit(session, { acao: "edicao", entidade: "fornecedor_evento", entidadeId: link.id, descricao: "Vínculo de fornecedor atualizado." });
      return link;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_suppliers");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      // event_supplier_financials cai junto via "on delete cascade".
      const { error } = await db.from("event_suppliers").delete().eq("id", id).eq("company_id", companyId);
      if (error) throw new Error(error.message);
    },
  },

  team: {
    async listByEvent(session, eventId) {
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("event_team_members")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEventTeamMember);
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_team");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      await assertEventInCompany(session, input.eventId);
      const { data: userRow, error: userError } = await db
        .from("profiles")
        .select("id, nome, status")
        .eq("id", input.userId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (userError) throw new Error(userError.message);
      if (!userRow) throw new Error("Usuário não encontrado nesta empresa.");
      if (userRow.status !== "ativo") throw new Error("Usuário inativo não pode ser alocado à equipe.");
      const { data: existing, error: existingError } = await db
        .from("event_team_members")
        .select("id")
        .eq("event_id", input.eventId)
        .eq("user_id", input.userId)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) throw new Error("Este usuário já está alocado à equipe deste evento.");

      const row = unwrap<Row>(
        await db
          .from("event_team_members")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            user_id: input.userId,
            funcao: input.funcao,
            responsabilidade: input.responsabilidade,
            escala: input.escala,
            status: input.status,
          })
          .select("*")
          .single(),
      );
      const member = mapEventTeamMember(row);
      await recordAudit(session, { acao: "criacao", entidade: "equipe_evento", entidadeId: member.id, descricao: `${userRow.nome} adicionado à equipe do evento como ${member.funcao}.` });
      return member;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_team");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("event_team_members")
          .update({
            funcao: input.funcao,
            responsabilidade: input.responsabilidade,
            escala: input.escala,
            status: input.status,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const member = mapEventTeamMember(row);
      await recordAudit(session, { acao: "edicao", entidade: "equipe_evento", entidadeId: member.id, descricao: "Membro de equipe atualizado." });
      return member;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_team");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { error } = await db.from("event_team_members").delete().eq("id", id).eq("company_id", companyId);
      if (error) throw new Error(error.message);
    },
  },

  participants: {
    async list(session, filters) {
      const db = getSupabaseServiceClient();
      let query = db.from("participants").select("*").eq("company_id", requireCompany(session));
      if (filters?.nome) query = query.ilike("nome", `%${filters.nome}%`);
      if (filters?.categoria) query = query.eq("categoria", filters.categoria);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query.order("nome");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapParticipant);
    },
    async get(session, id) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("participants")
        .select("*")
        .eq("id", id)
        .eq("company_id", requireCompany(session))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapParticipant(data) : null;
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_participants");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("participants")
          .insert({
            company_id: companyId,
            nome: input.nome,
            email: input.email,
            telefone: input.telefone,
            organizacao: input.organizacao,
            categoria: input.categoria,
            status: input.status,
            observacoes: input.observacoes,
          })
          .select("*")
          .single(),
      );
      const participant = mapParticipant(row);
      await recordAudit(session, { acao: "criacao", entidade: "participante", entidadeId: participant.id, descricao: `Participante "${participant.nome}" cadastrado.` });
      return participant;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_participants");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("participants")
          .update({
            nome: input.nome,
            email: input.email,
            telefone: input.telefone,
            organizacao: input.organizacao,
            categoria: input.categoria,
            status: input.status,
            observacoes: input.observacoes,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const participant = mapParticipant(row);
      await recordAudit(session, { acao: "edicao", entidade: "participante", entidadeId: participant.id, descricao: `Participante "${participant.nome}" editado.` });
      return participant;
    },
    async setStatus(session, id, status) {
      assertCan(session.perfil, "manage_participants");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db.from("participants").update({ status }).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const participant = mapParticipant(row);
      await recordAudit(session, {
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
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEventRegistration);
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_registrations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      await assertEventInCompany(session, input.eventId);
      const { data: participantRow, error: participantError } = await db
        .from("participants")
        .select("id, nome")
        .eq("id", input.participantId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (participantError) throw new Error(participantError.message);
      if (!participantRow) throw new Error("Participante não encontrado nesta empresa.");
      const { data: existing, error: existingError } = await db
        .from("event_registrations")
        .select("id")
        .eq("event_id", input.eventId)
        .eq("participant_id", input.participantId)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) throw new Error("Este participante já está inscrito neste evento.");

      const row = unwrap<Row>(
        await db
          .from("event_registrations")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            participant_id: input.participantId,
            lote: input.lote,
            categoria: input.categoria,
            status: "solicitada",
          })
          .select("*")
          .single(),
      );
      const registration = mapEventRegistration(row);
      await recordAudit(session, {
        acao: "criacao",
        entidade: "inscricao",
        entidadeId: registration.id,
        descricao: `Inscrição de "${participantRow.nome}" registrada para o evento.`,
      });
      return registration;
    },
    async updateStatus(session, id, status) {
      assertCan(session.perfil, "manage_registrations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db.from("event_registrations").update({ status }).eq("id", id).eq("company_id", companyId).select("*").single(),
      );
      const registration = mapEventRegistration(row);
      await recordAudit(session, { acao: "edicao", entidade: "inscricao", entidadeId: registration.id, descricao: `Inscrição atualizada para status ${status}.` });
      return registration;
    },
    async checkIn(session, id) {
      assertCan(session.perfil, "manage_registrations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { data: current, error: currentError } = await db
        .from("event_registrations")
        .select("status")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error("Inscrição não encontrada.");
      if (current.status !== "confirmada") throw new Error("Inscrição precisa estar confirmada para registrar check-in.");
      const row = unwrap<Row>(
        await db
          .from("event_registrations")
          .update({ check_in_at: new Date().toISOString(), check_in_por_id: session.userId })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const registration = mapEventRegistration(row);
      await recordAudit(session, { acao: "edicao", entidade: "credenciamento", entidadeId: registration.id, descricao: "Check-in registrado." });
      return registration;
    },
    async undoCheckIn(session, id) {
      assertCan(session.perfil, "manage_registrations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("event_registrations")
          .update({ check_in_at: null, check_in_por_id: null })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const registration = mapEventRegistration(row);
      await recordAudit(session, { acao: "edicao", entidade: "credenciamento", entidadeId: registration.id, descricao: "Check-in desfeito." });
      return registration;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_registrations");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { error } = await db.from("event_registrations").delete().eq("id", id).eq("company_id", companyId);
      if (error) throw new Error(error.message);
    },
  },

  schedule: {
    async listByEvent(session, eventId) {
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("schedule_items")
        .select("*")
        .eq("event_id", eventId)
        .order("inicio");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapScheduleItem);
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_schedule");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      await assertEventInCompany(session, input.eventId);
      if (input.responsavelId) {
        const { data: userRow, error: userError } = await db
          .from("profiles")
          .select("id")
          .eq("id", input.responsavelId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (userError) throw new Error(userError.message);
        if (!userRow) throw new Error("Responsável inválido para esta empresa.");
      }
      if (input.dependeDeId) {
        const { data: depRow, error: depError } = await db
          .from("schedule_items")
          .select("id")
          .eq("id", input.dependeDeId)
          .eq("event_id", input.eventId)
          .maybeSingle();
        if (depError) throw new Error(depError.message);
        if (!depRow) throw new Error("Atividade de dependência não encontrada neste evento.");
      }
      if (!(input.fim > input.inicio)) throw new Error("O fim da atividade precisa ser após o início.");

      const row = unwrap<Row>(
        await db
          .from("schedule_items")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            titulo: input.titulo,
            descricao: input.descricao,
            inicio: input.inicio,
            fim: input.fim,
            responsavel_id: input.responsavelId,
            depende_de_id: input.dependeDeId,
            prioridade: input.prioridade,
            status: input.status,
            observacao: input.observacao,
          })
          .select("*")
          .single(),
      );
      const item = mapScheduleItem(row);
      await recordAudit(session, { acao: "criacao", entidade: "cronograma", entidadeId: item.id, descricao: `Atividade "${item.titulo}" adicionada ao cronograma.` });
      return item;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_schedule");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { data: current, error: currentError } = await db
        .from("schedule_items")
        .select("event_id, inicio, fim")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error("Atividade não encontrada.");
      if (input.responsavelId) {
        const { data: userRow, error: userError } = await db
          .from("profiles")
          .select("id")
          .eq("id", input.responsavelId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (userError) throw new Error(userError.message);
        if (!userRow) throw new Error("Responsável inválido para esta empresa.");
      }
      if (input.dependeDeId) {
        if (input.dependeDeId === id) throw new Error("Uma atividade não pode depender dela mesma.");
        const { data: depRow, error: depError } = await db
          .from("schedule_items")
          .select("id")
          .eq("id", input.dependeDeId)
          .eq("event_id", current.event_id)
          .maybeSingle();
        if (depError) throw new Error(depError.message);
        if (!depRow) throw new Error("Atividade de dependência não encontrada neste evento.");
      }
      const inicio = input.inicio ?? current.inicio;
      const fim = input.fim ?? current.fim;
      if (!(fim > inicio)) throw new Error("O fim da atividade precisa ser após o início.");

      const row = unwrap<Row>(
        await db
          .from("schedule_items")
          .update({
            titulo: input.titulo,
            descricao: input.descricao,
            inicio: input.inicio,
            fim: input.fim,
            responsavel_id: input.responsavelId,
            depende_de_id: input.dependeDeId,
            prioridade: input.prioridade,
            status: input.status,
            observacao: input.observacao,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const item = mapScheduleItem(row);
      await recordAudit(session, { acao: "edicao", entidade: "cronograma", entidadeId: item.id, descricao: `Atividade "${item.titulo}" atualizada.` });
      return item;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_schedule");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      // Atividades que dependiam desta ficam sem dependência (a FK composta
      // é MATCH SIMPLE/nullable — não há "on delete cascade" aqui), em vez
      // de manter uma referência solta a um id removido.
      await db.from("schedule_items").update({ depende_de_id: null }).eq("depende_de_id", id).eq("company_id", companyId);
      const { error } = await db.from("schedule_items").delete().eq("id", id).eq("company_id", companyId);
      if (error) throw new Error(error.message);
    },
  },

  documents: {
    async listByEvent(session, eventId, options) {
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      let query = db.from("event_documents").select("*").eq("event_id", eventId);
      if (!options?.includeArchived) query = query.eq("status", "ativo");
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapEventDocument);
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_documents");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      await assertEventInCompany(session, input.eventId);
      const { data: userRow, error: userError } = await db
        .from("profiles")
        .select("id")
        .eq("id", input.responsavelId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (userError) throw new Error(userError.message);
      if (!userRow) throw new Error("Responsável inválido para esta empresa.");

      const row = unwrap<Row>(
        await db
          .from("event_documents")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            categoria: input.categoria,
            titulo: input.titulo,
            descricao: input.descricao,
            url_referencia: input.urlReferencia,
            nome_arquivo: input.nomeArquivo,
            responsavel_id: input.responsavelId,
            status: "ativo",
          })
          .select("*")
          .single(),
      );
      const document = mapEventDocument(row);
      await recordAudit(session, { acao: "criacao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" registrado.` });
      return document;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_documents");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      if (input.responsavelId) {
        const { data: userRow, error: userError } = await db
          .from("profiles")
          .select("id")
          .eq("id", input.responsavelId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (userError) throw new Error(userError.message);
        if (!userRow) throw new Error("Responsável inválido para esta empresa.");
      }
      const row = unwrap<Row>(
        await db
          .from("event_documents")
          .update({
            categoria: input.categoria,
            titulo: input.titulo,
            descricao: input.descricao,
            url_referencia: input.urlReferencia,
            nome_arquivo: input.nomeArquivo,
            responsavel_id: input.responsavelId,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const document = mapEventDocument(row);
      await recordAudit(session, { acao: "edicao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" atualizado.` });
      return document;
    },
    async archive(session, id) {
      assertCan(session.perfil, "manage_documents");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("event_documents")
          .update({ status: "arquivado", arquivado_em: new Date().toISOString() })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const document = mapEventDocument(row);
      await recordAudit(session, { acao: "edicao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" arquivado.` });
      return document;
    },
    async restore(session, id) {
      assertCan(session.perfil, "manage_documents");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("event_documents")
          .update({ status: "ativo", arquivado_em: null })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const document = mapEventDocument(row);
      await recordAudit(session, { acao: "edicao", entidade: "documento", entidadeId: document.id, descricao: `Documento "${document.titulo}" restaurado.` });
      return document;
    },
  },

  budget: {
    async getByEvent(session, eventId) {
      // Valores financeiros só podem ser lidos por quem tem
      // "view_financials". O cliente de serviço ignora RLS, então essa
      // checagem precisa acontecer aqui — a UI só evita chamar isto
      // para outros perfis, mas isso não protege uma chamada direta.
      assertCan(session.perfil, "view_financials");
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("budgets")
        .select("*")
        .eq("event_id", eventId)
        .eq("company_id", requireCompany(session))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapBudget(data) : null;
    },
    async upsert(session, eventId, input) {
      assertCan(session.perfil, "manage_budget");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const row = unwrap<Row>(
        await db
          .from("budgets")
          .upsert(
            {
              company_id: companyId,
              event_id: eventId,
              valor_previsto: input.valorPrevisto,
              observacoes: input.observacoes,
              status: input.status,
            },
            { onConflict: "event_id" },
          )
          .select("*")
          .single(),
      );
      await db.from("events").update({ previsto_orcamento: true }).eq("id", eventId).eq("company_id", companyId);
      const budget = mapBudget(row);
      await recordAudit(session, { acao: "edicao", entidade: "orcamento", entidadeId: budget.id, descricao: "Orçamento previsto do evento atualizado." });
      return budget;
    },
  },

  budgetItems: {
    async listByEvent(session, eventId) {
      // Mesma proteção de budget.getByEvent — itens de orçamento também
      // são valor financeiro, atrás de "view_financials".
      assertCan(session.perfil, "view_financials");
      const db = getSupabaseServiceClient();
      await assertEventInCompany(session, eventId);
      const { data, error } = await db
        .from("budget_items")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapBudgetItem);
    },
    async create(session, input) {
      assertCan(session.perfil, "manage_budget");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      await assertEventInCompany(session, input.eventId);
      if (input.supplierId) {
        const { data: supplierRow, error: supplierError } = await db
          .from("suppliers")
          .select("id")
          .eq("id", input.supplierId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (supplierError) throw new Error(supplierError.message);
        if (!supplierRow) throw new Error("Fornecedor não encontrado nesta empresa.");
      }
      for (const [label, value] of [
        ["cotado", input.valorCotado],
        ["contratado", input.valorContratado],
        ["realizado", input.valorRealizado],
      ] as const) {
        if (value != null && value < 0) throw new Error(`Valor ${label} não pode ser negativo.`);
      }

      const row = unwrap<Row>(
        await db
          .from("budget_items")
          .insert({
            company_id: companyId,
            event_id: input.eventId,
            categoria: input.categoria,
            supplier_id: input.supplierId,
            descricao: input.descricao,
            valor_cotado: input.valorCotado,
            valor_contratado: input.valorContratado,
            valor_realizado: input.valorRealizado,
            status: input.status,
            observacoes: input.observacoes,
          })
          .select("*")
          .single(),
      );
      const item = mapBudgetItem(row);
      await recordAudit(session, { acao: "criacao", entidade: "orcamento_item", entidadeId: item.id, descricao: `Item de orçamento "${item.descricao}" criado.` });
      return item;
    },
    async update(session, id, input) {
      assertCan(session.perfil, "manage_budget");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      if (input.supplierId) {
        const { data: supplierRow, error: supplierError } = await db
          .from("suppliers")
          .select("id")
          .eq("id", input.supplierId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (supplierError) throw new Error(supplierError.message);
        if (!supplierRow) throw new Error("Fornecedor não encontrado nesta empresa.");
      }
      for (const [label, value] of [
        ["cotado", input.valorCotado],
        ["contratado", input.valorContratado],
        ["realizado", input.valorRealizado],
      ] as const) {
        if (value != null && value < 0) throw new Error(`Valor ${label} não pode ser negativo.`);
      }

      const row = unwrap<Row>(
        await db
          .from("budget_items")
          .update({
            categoria: input.categoria,
            supplier_id: input.supplierId,
            descricao: input.descricao,
            valor_cotado: input.valorCotado,
            valor_contratado: input.valorContratado,
            valor_realizado: input.valorRealizado,
            status: input.status,
            observacoes: input.observacoes,
          })
          .eq("id", id)
          .eq("company_id", companyId)
          .select("*")
          .single(),
      );
      const item = mapBudgetItem(row);
      await recordAudit(session, { acao: "edicao", entidade: "orcamento_item", entidadeId: item.id, descricao: `Item de orçamento "${item.descricao}" atualizado.` });
      return item;
    },
    async remove(session, id) {
      assertCan(session.perfil, "manage_budget");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const { error } = await db.from("budget_items").delete().eq("id", id).eq("company_id", companyId);
      if (error) throw new Error(error.message);
    },
  },

  complexity: {
    async getLatestByEvent(session, eventId) {
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("complexity_assessments")
        .select("*")
        .eq("event_id", eventId)
        .eq("company_id", requireCompany(session))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapComplexity(data) : null;
    },
    async assess(session, eventId, factors: ComplexityFactors) {
      assertCan(session.perfil, "assess_complexity");
      const db = getSupabaseServiceClient();
      const companyId = requireCompany(session);
      const result = calculateComplexity(factors);
      const row = unwrap<Row>(
        await db
          .from("complexity_assessments")
          .insert({
            company_id: companyId,
            event_id: eventId,
            fatores: factors,
            esforco: result.esforco,
            impacto: result.impacto,
            pontuacao: result.pontuacao,
            nivel: result.nivel,
          })
          .select("*")
          .single(),
      );
      const assessment = mapComplexity(row);
      await recordAudit(session, { acao: "edicao", entidade: "complexidade", entidadeId: assessment.id, descricao: `Complexidade recalculada: ${COMPLEXITY_LEVEL_LABELS[assessment.nivel]} (pontuação ${assessment.pontuacao}).` });
      return assessment;
    },
  },

  audit: {
    async list(session, filters) {
      assertCan(session.perfil, "view_audit");
      const db = getSupabaseServiceClient();
      let query = db.from("audit_logs").select("*").eq("company_id", requireCompany(session));
      if (filters?.entidade) query = query.eq("entidade", filters.entidade);
      if (filters?.acao) query = query.eq("acao", filters.acao);
      if (filters?.dataInicial) query = query.gte("created_at", filters.dataInicial);
      if (filters?.dataFinal) query = query.lte("created_at", filters.dataFinal);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapAuditLog);
    },
    async record(session, entry) {
      await recordAudit(session, entry as { acao: string; entidade: string; entidadeId: string; descricao: string });
      const db = getSupabaseServiceClient();
      const { data, error } = await db
        .from("audit_logs")
        .select("*")
        .eq("company_id", requireCompany(session))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) throw new Error(error.message);
      return mapAuditLog(data);
    },
  },

  dashboard: {
    async get(session, period): Promise<DashboardData> {
      // Implementação de referência: reutiliza os repositórios acima para
      // compor os indicadores a partir de dados reais do Postgres.
      const companyId = requireCompany(session);
      const db = getSupabaseServiceClient();

      let eventsQuery = db.from("events").select("*").eq("company_id", companyId);
      if (period) eventsQuery = eventsQuery.gte("created_at", period.from).lte("created_at", period.to);
      const { data: eventRows, error: eventsError } = await eventsQuery;
      if (eventsError) throw new Error(eventsError.message);
      const events = (eventRows ?? []).map(mapEvent);

      const { data: reservationRows } = await db.from("reservations").select("*").eq("company_id", companyId);
      const reservations = (reservationRows ?? []).map(mapReservation);

      const { data: complexityRows } = await db
        .from("complexity_assessments")
        .select("*")
        .eq("company_id", companyId);
      const complexityByEvent = new Map<string, string>();
      for (const row of complexityRows ?? []) {
        if (!complexityByEvent.has(row.event_id)) complexityByEvent.set(row.event_id, row.nivel);
      }

      const { data: budgetRows } = await db.from("budgets").select("event_id").eq("company_id", companyId);
      const budgetEventIds = new Set((budgetRows ?? []).map((b: { event_id: string }) => b.event_id));

      const eventosPorStatus: Record<string, number> = {};
      const eventosPorCategoria: Record<string, number> = {};
      const eventosPorComplexidade: Record<string, number> = {};
      let eventosEstrategicos = 0;
      let eventosComOrcamento = 0;
      let eventosSemOrcamento = 0;
      for (const e of events) {
        eventosPorStatus[e.status] = (eventosPorStatus[e.status] ?? 0) + 1;
        eventosPorCategoria[e.categoria] = (eventosPorCategoria[e.categoria] ?? 0) + 1;
        const nivel = complexityByEvent.get(e.id) ?? "n/a";
        eventosPorComplexidade[nivel] = (eventosPorComplexidade[nivel] ?? 0) + 1;
        if (e.estrategico) eventosEstrategicos += 1;
        if (e.previstoOrcamento || budgetEventIds.has(e.id)) eventosComOrcamento += 1;
        else eventosSemOrcamento += 1;
      }

      const reservasPorStatus: Record<string, number> = {};
      for (const r of reservations) reservasPorStatus[r.status] = (reservasPorStatus[r.status] ?? 0) + 1;

      const { data: spaceRows } = await db.from("spaces").select("*").eq("company_id", companyId);
      const spaces = (spaceRows ?? []).map(mapSpace);
      const now = Date.now();
      const horizonDays = 30;
      const ocupacaoEspacos = spaces.map((s) => {
        const relevant = reservations.filter(
          (r: Reservation) => r.spaceId === s.id && r.status !== "cancelada" && new Date(r.inicio).getTime() >= now,
        );
        const horasReservadas = relevant.reduce(
          (sum: number, r: Reservation) => sum + (new Date(r.fim).getTime() - new Date(r.inicio).getTime()) / 3_600_000,
          0,
        );
        const horasDisponiveis = horizonDays * 10;
        return { spaceId: s.id, nome: s.nome, percentual: Math.min(100, Math.round((horasReservadas / horasDisponiveis) * 100)) };
      });

      const proximosEventos = events
        .filter((e) => e.status !== "cancelado")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6);

      return {
        totalEventos: events.length,
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
      const companyId = requireCompany(session);
      const db = getSupabaseServiceClient();
      // Orçamento excedido só é computado para quem tem "view_financials"
      // — mesma proteção de budget.getByEvent/budgetItems.listByEvent
      // (fatia 4a): a consulta nem roda para quem não tem a capability.
      const canFinancials = can(session.perfil, "view_financials");
      const nowMs = Date.now();
      const DAY_MS = 24 * 3600_000;
      const RECENCY_MS = 7 * DAY_MS;
      const PRAZO_CHECKLIST_MS = 3 * DAY_MS;
      const PRAZO_SCHEDULE_MS = DAY_MS;

      const { data: eventRows, error: eventsError } = await db.from("events").select("*").eq("company_id", companyId);
      if (eventsError) throw new Error(eventsError.message);
      const events = (eventRows ?? []).map(mapEvent);
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

      // Checklist: prazo próximo + tarefa atrasada + atividade bloqueada
      const { data: checklistRows, error: checklistError } = await db
        .from("checklist_items")
        .select("*")
        .eq("company_id", companyId);
      if (checklistError) throw new Error(checklistError.message);
      for (const row of (checklistRows ?? []).map(mapChecklistItem)) {
        if (!openEventIds.has(row.eventId)) continue;
        const event = eventById.get(row.eventId);
        if (!event) continue;
        if (row.status === "bloqueado") {
          push({
            type: "atividade_bloqueada",
            severity: "danger",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Item de checklist bloqueado: "${row.titulo}"`,
            referenceAt: row.updatedAt,
          });
        }
        if (row.prazo && row.status !== "concluido" && row.status !== "cancelado") {
          const prazoMs = new Date(row.prazo).getTime();
          if (prazoMs < nowMs) {
            push({
              type: "tarefa_atrasada",
              severity: "danger",
              eventId: event.id,
              eventTitulo: event.titulo,
              titulo: `Item de checklist atrasado: "${row.titulo}"`,
              referenceAt: row.prazo,
            });
          } else if (prazoMs - nowMs <= PRAZO_CHECKLIST_MS) {
            push({
              type: "prazo_proximo",
              severity: "warning",
              eventId: event.id,
              eventTitulo: event.titulo,
              titulo: `Prazo próximo no checklist: "${row.titulo}"`,
              referenceAt: row.prazo,
            });
          }
        }
      }

      // Cronograma: prazo próximo + atividade atrasada
      const { data: scheduleRows, error: scheduleError } = await db
        .from("schedule_items")
        .select("*")
        .eq("company_id", companyId);
      if (scheduleError) throw new Error(scheduleError.message);
      for (const row of (scheduleRows ?? []).map(mapScheduleItem)) {
        if (!openEventIds.has(row.eventId) || row.status === "concluido" || row.status === "cancelado") continue;
        const event = eventById.get(row.eventId);
        if (!event) continue;
        const fimMs = new Date(row.fim).getTime();
        const inicioMs = new Date(row.inicio).getTime();
        if (fimMs < nowMs) {
          push({
            type: "tarefa_atrasada",
            severity: "danger",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Atividade do cronograma atrasada: "${row.titulo}"`,
            referenceAt: row.fim,
          });
        } else if (inicioMs >= nowMs && inicioMs - nowMs <= PRAZO_SCHEDULE_MS) {
          push({
            type: "prazo_proximo",
            severity: "warning",
            eventId: event.id,
            eventTitulo: event.titulo,
            titulo: `Atividade próxima no cronograma: "${row.titulo}"`,
            referenceAt: row.inicio,
          });
        }
      }

      // Documentos: evento aberto sem nenhum documento ativo registrado
      const { data: documentRows, error: documentsError } = await db
        .from("event_documents")
        .select("event_id, status")
        .eq("company_id", companyId)
        .eq("status", "ativo");
      if (documentsError) throw new Error(documentsError.message);
      const activeDocEventIds = new Set((documentRows ?? []).map((d: { event_id: string }) => d.event_id));
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
      const { data: reservationRows, error: reservationsError } = await db
        .from("reservations")
        .select("*")
        .eq("company_id", companyId);
      if (reservationsError) throw new Error(reservationsError.message);
      for (const row of (reservationRows ?? []).map(mapReservation)) {
        if (!row.eventId || !openEventIds.has(row.eventId)) continue;
        if (row.updatedAt === row.createdAt) continue;
        if (nowMs - new Date(row.updatedAt).getTime() > RECENCY_MS) continue;
        const event = eventById.get(row.eventId);
        if (!event) continue;
        push({
          type: "reserva_alterada",
          severity: "info",
          eventId: event.id,
          eventTitulo: event.titulo,
          titulo: `Reserva alterada (status atual: ${RESERVATION_STATUS_LABELS[row.status]})`,
          referenceAt: row.updatedAt,
        });
      }

      // Mudança relevante de status (histórico já existente de
      // event_status_history) — ignora a transição inicial (criação do
      // evento, status_anterior null), que não é uma "mudança".
      const { data: historyRows, error: historyError } = await db
        .from("event_status_history")
        .select("*")
        .eq("company_id", companyId)
        .not("status_anterior", "is", null);
      if (historyError) throw new Error(historyError.message);
      for (const row of (historyRows ?? []).map(mapStatusHistory)) {
        if (row.statusAnterior === null) continue;
        if (nowMs - new Date(row.createdAt).getTime() > RECENCY_MS) continue;
        const event = eventById.get(row.eventId);
        if (!event) continue;
        push({
          type: "mudanca_status",
          severity: "info",
          eventId: event.id,
          eventTitulo: event.titulo,
          titulo: `Status alterado de "${EVENT_STATUS_LABELS[row.statusAnterior]}" para "${EVENT_STATUS_LABELS[row.statusNovo]}"`,
          referenceAt: row.createdAt,
        });
      }

      // Orçamento excedido (comprometido/realizado acima do previsto) —
      // mesmo raciocínio de Comprometido/Realizado da aba Orçamento
      // (fatia 4a): soma só valor_contratado/valor_realizado, nunca cotado.
      if (canFinancials) {
        const { data: budgetRows, error: budgetsError } = await db.from("budgets").select("*").eq("company_id", companyId);
        if (budgetsError) throw new Error(budgetsError.message);
        const { data: budgetItemRows, error: budgetItemsError } = await db
          .from("budget_items")
          .select("*")
          .eq("company_id", companyId);
        if (budgetItemsError) throw new Error(budgetItemsError.message);
        const budgetItemsByEvent = new Map<string, ReturnType<typeof mapBudgetItem>[]>();
        for (const item of (budgetItemRows ?? []).map(mapBudgetItem)) {
          if (item.status === "cancelado") continue;
          const list = budgetItemsByEvent.get(item.eventId) ?? [];
          list.push(item);
          budgetItemsByEvent.set(item.eventId, list);
        }
        for (const row of (budgetRows ?? []).map(mapBudget)) {
          if (!openEventIds.has(row.eventId)) continue;
          const event = eventById.get(row.eventId);
          if (!event) continue;
          const activeItems = budgetItemsByEvent.get(row.eventId) ?? [];
          const comprometido = activeItems.reduce((sum, i) => sum + (i.valorContratado ?? 0), 0);
          const realizado = activeItems.reduce((sum, i) => sum + (i.valorRealizado ?? 0), 0);
          if (realizado > row.valorPrevisto) {
            push({
              type: "orcamento_excedido",
              severity: "danger",
              eventId: event.id,
              eventTitulo: event.titulo,
              titulo: "Orçamento realizado ultrapassou o valor previsto",
              referenceAt: row.updatedAt,
            });
          } else if (comprometido > row.valorPrevisto) {
            push({
              type: "orcamento_excedido",
              severity: "warning",
              eventId: event.id,
              eventTitulo: event.titulo,
              titulo: "Orçamento comprometido acima do valor previsto",
              referenceAt: row.updatedAt,
            });
          }
        }
      }

      return items.sort((a, b) => b.referenceAt.localeCompare(a.referenceAt));
    },
  },
};

async function assertEventInCompany(session: AuthSession, eventId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("company_id", requireCompany(session))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Evento não encontrado.");
}

/**
 * Quem só tem "create_event" (Operador) só pode continuar editando o
 * próprio rascunho ainda não publicado — edição plena de qualquer evento
 * é exclusiva de "create_edit_event" (Gestor/Admin).
 */
async function assertCanEditEvent(session: AuthSession, eventId: string) {
  if (can(session.perfil, "create_edit_event")) return;
  if (!can(session.perfil, "create_event")) throw new PermissionError("create_edit_event");
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("events")
    .select("created_by, status")
    .eq("id", eventId)
    .eq("company_id", requireCompany(session))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.created_by !== session.userId || data.status !== "rascunho") {
    throw new PermissionError("create_edit_event");
  }
}

async function updateEventStatus(
  session: AuthSession,
  id: string,
  status: EventStatus,
  acao: "alteracao_status" | "cancelamento",
) {
  assertCan(session.perfil, "create_edit_event");
  const db = getSupabaseServiceClient();
  const companyId = requireCompany(session);
  const { data: current, error: currentError } = await db
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) throw new Error("Evento não encontrado.");

  const row = unwrap<Row>(
    await db
      .from("events")
      .update({ status, updated_by: session.userId })
      .eq("id", id)
      .eq("company_id", companyId)
      .select("*")
      .single(),
  );
  const event = mapEvent(row);
  await db.from("event_status_history").insert({
    company_id: companyId,
    event_id: id,
    status_anterior: current.status,
    status_novo: status,
    user_id: session.userId,
  });
  await recordAudit(session, {
    acao,
    entidade: "evento",
    entidadeId: id,
    descricao: `Status do evento "${event.titulo}" alterado de ${EVENT_STATUS_LABELS[current.status as EventStatus]} para ${EVENT_STATUS_LABELS[status]}.`,
  });
  return event;
}
