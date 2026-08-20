import type {
  AuthSession,
  ComplexityFactors,
  EventSession,
  EventStatus,
  Reservation,
} from "@/lib/domain/types";
import { assertCan } from "@/lib/domain/permissions";
import { checkAvailability } from "@/lib/domain/availability";
import { calculateComplexity } from "@/lib/domain/complexity";
import type { DashboardData, Repository } from "../repository";
import { getSupabaseServiceClient } from "./client";
import {
  eventToRow,
  mapAuditLog,
  mapBudget,
  mapChecklistItem,
  mapCompany,
  mapComplexity,
  mapEvent,
  mapEventSession,
  mapReservation,
  mapSpace,
  mapStatusHistory,
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
      await recordAudit(session, { acao: "administrativo", entidade: "usuario", entidadeId: user.id, descricao: `Usuário "${user.nome}" criado com perfil ${user.perfil}.` });
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
      await recordAudit(session, { acao: status === "inativo" ? "cancelamento" : "edicao", entidade: "espaco", entidadeId: space.id, descricao: `Espaço "${space.nome}" marcado como ${status}.` });
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
      await recordAudit(session, { acao: status === "cancelada" ? "cancelamento" : "edicao", entidade: "reserva", entidadeId: reservation.id, descricao: `Reserva atualizada para status ${status}.` });
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
      assertCan(session.perfil, "create_edit_event");
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
      assertCan(session.perfil, "create_edit_event");
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
      assertCan(session.perfil, "create_edit_event");
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

  budget: {
    async getByEvent(session, eventId) {
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
      await recordAudit(session, { acao: "edicao", entidade: "complexidade", entidadeId: assessment.id, descricao: `Complexidade recalculada: ${assessment.nivel} (pontuação ${assessment.pontuacao}).` });
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
    descricao: `Status do evento "${event.titulo}" alterado de ${current.status} para ${status}.`,
  });
  return event;
}
