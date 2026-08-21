import type {
  AuditAction,
  AuditLog,
  AuthSession,
  Budget,
  ChecklistItem,
  Company,
  ComplexityAssessment,
  ComplexityFactors,
  EventEntity,
  EventSession,
  EventStatus,
  EventSupplier,
  EventTeamMember,
  Reservation,
  Space,
  StatusHistoryEntry,
  Supplier,
  SupplierStatus,
  User,
} from "../domain/types";

/**
 * Contrato único da camada de dados do 7Eventos.
 *
 * Toda tela/server action deve depender apenas desta interface, nunca
 * de `mock/*` ou `supabase/*` diretamente (ver `src/lib/data/index.ts`).
 * Isso permite trocar a fonte de dados (mock em memória para
 * demonstração x Supabase/Postgres para o ambiente oficial) sem tocar
 * em UI. Toda implementação DEVE aplicar RN01 (isolamento por
 * `companyId`) e RN11 (permissões) internamente — nunca confiar apenas
 * no chamador.
 */

export interface EventSearchFilters {
  texto?: string;
  demandante?: string;
  dataInicial?: string;
  dataFinal?: string;
  status?: EventStatus;
  complexidade?: string;
  spaceId?: string;
  tematica?: string;
  estrategico?: boolean;
}

export interface SpaceSearchFilters {
  local?: string;
  nome?: string;
  status?: "ativo" | "inativo";
  capacidadeMinima?: number;
}

export interface SupplierSearchFilters {
  nome?: string;
  categoria?: string;
  status?: SupplierStatus;
}

export interface ReservationSearchFilters {
  spaceId?: string;
  status?: string;
  dataInicial?: string;
  dataFinal?: string;
  eventId?: string | null;
}

export interface DashboardPeriod {
  from: string;
  to: string;
}

export interface DashboardData {
  totalEventos: number;
  proximosEventos: EventEntity[];
  eventosPorStatus: Record<string, number>;
  eventosPorCategoria: Record<string, number>;
  eventosPorComplexidade: Record<string, number>;
  eventosEstrategicos: number;
  reservasPorStatus: Record<string, number>;
  eventosComOrcamento: number;
  eventosSemOrcamento: number;
  ocupacaoEspacos: { spaceId: string; nome: string; percentual: number }[];
}

export interface Repository {
  // Empresas / usuários --------------------------------------------------
  companies: {
    list(session: AuthSession): Promise<Company[]>;
    get(session: AuthSession, id: string): Promise<Company | null>;
  };
  users: {
    list(session: AuthSession): Promise<User[]>;
    get(session: AuthSession, id: string): Promise<User | null>;
    getByEmail(email: string): Promise<User | null>;
    create(
      session: AuthSession,
      input: Omit<User, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<User>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Pick<User, "nome" | "perfil" | "status">>,
    ): Promise<User>;
  };

  // Espaços ----------------------------------------------------------------
  spaces: {
    list(session: AuthSession, filters?: SpaceSearchFilters): Promise<Space[]>;
    get(session: AuthSession, id: string): Promise<Space | null>;
    create(
      session: AuthSession,
      input: Omit<Space, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<Space>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<Space, "id" | "companyId">>,
    ): Promise<Space>;
    setStatus(
      session: AuthSession,
      id: string,
      status: Space["status"],
    ): Promise<Space>;
  };

  // Reservas -----------------------------------------------------------
  reservations: {
    list(
      session: AuthSession,
      filters?: ReservationSearchFilters,
    ): Promise<Reservation[]>;
    get(session: AuthSession, id: string): Promise<Reservation | null>;
    checkAvailability(
      session: AuthSession,
      input: {
        spaceId: string;
        inicio: string;
        fim: string;
        quantidadePessoas?: number;
        ignoreReservationId?: string;
      },
    ): Promise<{ available: boolean; issues: { code: string; message: string }[] }>;
    create(
      session: AuthSession,
      input: Omit<
        Reservation,
        "id" | "companyId" | "status" | "createdAt" | "updatedAt"
      >,
    ): Promise<Reservation>;
    updateStatus(
      session: AuthSession,
      id: string,
      status: Reservation["status"],
    ): Promise<Reservation>;
    linkToEvent(
      session: AuthSession,
      id: string,
      eventId: string,
    ): Promise<Reservation>;
  };

  // Eventos ------------------------------------------------------------
  events: {
    search(
      session: AuthSession,
      filters: EventSearchFilters,
    ): Promise<EventEntity[]>;
    get(session: AuthSession, id: string): Promise<EventEntity | null>;
    listUpcoming(session: AuthSession, limit?: number): Promise<EventEntity[]>;
    listForAgenda(
      session: AuthSession,
      range: { from: string; to: string },
    ): Promise<{ event: EventEntity; sessions: EventSession[] }[]>;
    create(
      session: AuthSession,
      input: Omit<
        EventEntity,
        | "id"
        | "companyId"
        | "createdBy"
        | "createdAt"
        | "updatedBy"
        | "updatedAt"
      >,
      sessions: Omit<EventSession, "id" | "eventId">[],
    ): Promise<EventEntity>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<
        Omit<EventEntity, "id" | "companyId" | "createdBy" | "createdAt">
      >,
    ): Promise<EventEntity>;
    updateStatus(
      session: AuthSession,
      id: string,
      status: EventStatus,
    ): Promise<EventEntity>;
    cancel(session: AuthSession, id: string): Promise<EventEntity>;
    getSessions(session: AuthSession, eventId: string): Promise<EventSession[]>;
    replaceSessions(
      session: AuthSession,
      eventId: string,
      sessions: Omit<EventSession, "id" | "eventId">[],
    ): Promise<EventSession[]>;
    getStatusHistory(
      session: AuthSession,
      eventId: string,
    ): Promise<StatusHistoryEntry[]>;
  };

  // Checklist ------------------------------------------------------------
  checklist: {
    listByEvent(session: AuthSession, eventId: string): Promise<ChecklistItem[]>;
    create(
      session: AuthSession,
      input: Omit<ChecklistItem, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<ChecklistItem>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<ChecklistItem, "id" | "companyId" | "eventId">>,
    ): Promise<ChecklistItem>;
    remove(session: AuthSession, id: string): Promise<void>;
  };

  // Fornecedores (Fase 2) ---------------------------------------------------
  suppliers: {
    list(session: AuthSession, filters?: SupplierSearchFilters): Promise<Supplier[]>;
    get(session: AuthSession, id: string): Promise<Supplier | null>;
    create(
      session: AuthSession,
      input: Omit<Supplier, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<Supplier>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<Supplier, "id" | "companyId">>,
    ): Promise<Supplier>;
    setStatus(
      session: AuthSession,
      id: string,
      status: SupplierStatus,
    ): Promise<Supplier>;
  };

  // Vínculo de fornecedores a eventos (Fase 2) -------------------------------
  eventSuppliers: {
    listByEvent(session: AuthSession, eventId: string): Promise<EventSupplier[]>;
    create(
      session: AuthSession,
      input: Omit<EventSupplier, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<EventSupplier>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<EventSupplier, "id" | "companyId" | "eventId" | "supplierId">>,
    ): Promise<EventSupplier>;
    remove(session: AuthSession, id: string): Promise<void>;
  };

  // Equipe do evento (Fase 2) ------------------------------------------------
  team: {
    listByEvent(session: AuthSession, eventId: string): Promise<EventTeamMember[]>;
    create(
      session: AuthSession,
      input: Omit<EventTeamMember, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<EventTeamMember>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<EventTeamMember, "id" | "companyId" | "eventId">>,
    ): Promise<EventTeamMember>;
    remove(session: AuthSession, id: string): Promise<void>;
  };

  // Orçamento --------------------------------------------------------------
  budget: {
    getByEvent(session: AuthSession, eventId: string): Promise<Budget | null>;
    upsert(
      session: AuthSession,
      eventId: string,
      input: Pick<Budget, "valorPrevisto" | "observacoes" | "status">,
    ): Promise<Budget>;
  };

  // Complexidade ------------------------------------------------------------
  complexity: {
    getLatestByEvent(
      session: AuthSession,
      eventId: string,
    ): Promise<ComplexityAssessment | null>;
    assess(
      session: AuthSession,
      eventId: string,
      factors: ComplexityFactors,
    ): Promise<ComplexityAssessment>;
  };

  // Auditoria ------------------------------------------------------------
  audit: {
    list(
      session: AuthSession,
      filters?: { entidade?: string; acao?: AuditAction; dataInicial?: string; dataFinal?: string },
    ): Promise<AuditLog[]>;
    record(
      session: AuthSession,
      entry: Omit<AuditLog, "id" | "companyId" | "userId" | "createdAt">,
    ): Promise<AuditLog>;
  };

  // Dashboard / relatórios --------------------------------------------------
  dashboard: {
    get(session: AuthSession, period?: DashboardPeriod): Promise<DashboardData>;
  };
}
