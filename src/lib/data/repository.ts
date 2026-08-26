import type {
  AuditAction,
  AuditLog,
  AuthSession,
  Budget,
  BudgetItem,
  ChecklistItem,
  Company,
  ComplexityAssessment,
  ComplexityFactors,
  EventDocument,
  EventEntity,
  EventRegistration,
  EventRisk,
  EventSession,
  EventStatus,
  EventSupplier,
  EventTeamMember,
  NotificationItem,
  Participant,
  ParticipantStatus,
  Reservation,
  ScheduleItem,
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

export interface ParticipantSearchFilters {
  nome?: string;
  categoria?: string;
  status?: ParticipantStatus;
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

/**
 * Relatórios avançados (Fase 2, docs/FASE_02_GESTAO.md seção 12) —
 * agregados computados a partir de dados já existentes, sem tabela
 * nova. `previstoRealizado` fica vazio e `valorContratado` de
 * `fornecedores` fica undefined para quem não tem "view_financials" —
 * o próprio repositório aplica essa checagem (mesma proteção de
 * budget.getByEvent/budgetItems.listByEvent, fatia 4a), então a UI só
 * precisa decidir se mostra a seção, nunca precisa confiar sozinha em
 * esconder o dado.
 */
export interface PrevistoRealizadoRow {
  eventId: string;
  eventTitulo: string;
  previsto: number;
  comprometido: number;
  realizado: number;
}

export interface SupplierPerformanceRow {
  supplierId: string;
  supplierNome: string;
  categoria: string;
  eventosVinculados: number;
  /** undefined para quem não tem "view_financials" — nunca "0" (não confundir ausência de dado com valor zero). */
  valorContratado?: number;
}

export interface AttendanceSummary {
  totalConfirmados: number;
  totalPresentes: number;
  totalAusentes: number;
  taxaPresencaPct: number | null;
}

export interface OccupancyRow {
  spaceId: string;
  spaceNome: string;
  percentual: number;
}

export interface ScheduleComplianceSummary {
  totalAtividades: number;
  concluidas: number;
  atrasadas: number;
  taxaConclusaoPct: number | null;
}

export interface ChecklistComplianceSummary {
  totalItens: number;
  concluidos: number;
  taxaConclusaoPct: number | null;
}

export interface PeriodPerformanceRow {
  /** "YYYY-MM", derivado de events.created_at. */
  periodo: string;
  totalEventos: number;
  concluidos: number;
  cancelados: number;
}

export interface EventHistoryRow {
  eventId: string;
  eventTitulo: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  mudancasDeStatus: number;
}

export interface AdvancedReportsData {
  previstoRealizado: PrevistoRealizadoRow[];
  fornecedores: SupplierPerformanceRow[];
  presenca: AttendanceSummary;
  ocupacao: OccupancyRow[];
  cronograma: ScheduleComplianceSummary;
  checklist: ChecklistComplianceSummary;
  performancePorPeriodo: PeriodPerformanceRow[];
  historicoEventos: EventHistoryRow[];
}

export interface Repository {
  // Empresas / usuários --------------------------------------------------
  companies: {
    list(session: AuthSession): Promise<Company[]>;
    get(session: AuthSession, id: string): Promise<Company | null>;
    updateBranding(
      session: AuthSession,
      input: Pick<Company["configuracoes"], "corPrimaria" | "corSecundaria" | "logoUrl">,
    ): Promise<Company>;
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
      input: Partial<Omit<EventTeamMember, "id" | "companyId" | "eventId" | "userId">>,
    ): Promise<EventTeamMember>;
    remove(session: AuthSession, id: string): Promise<void>;
  };

  // Participantes (Fase 2) --------------------------------------------------
  participants: {
    list(session: AuthSession, filters?: ParticipantSearchFilters): Promise<Participant[]>;
    get(session: AuthSession, id: string): Promise<Participant | null>;
    create(
      session: AuthSession,
      input: Omit<Participant, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<Participant>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<Participant, "id" | "companyId">>,
    ): Promise<Participant>;
    setStatus(
      session: AuthSession,
      id: string,
      status: ParticipantStatus,
    ): Promise<Participant>;
  };

  // Inscrição + Credenciamento (Fase 2) --------------------------------------
  registrations: {
    listByEvent(session: AuthSession, eventId: string): Promise<EventRegistration[]>;
    create(
      session: AuthSession,
      input: Omit<
        EventRegistration,
        "id" | "companyId" | "status" | "checkInAt" | "checkInPorId" | "createdAt" | "updatedAt"
      >,
    ): Promise<EventRegistration>;
    updateStatus(
      session: AuthSession,
      id: string,
      status: EventRegistration["status"],
    ): Promise<EventRegistration>;
    /** Credenciamento: registra checkInAt=agora e checkInPorId=usuário da sessão. Exige inscrição confirmada. */
    checkIn(session: AuthSession, id: string): Promise<EventRegistration>;
    /** Desfaz um check-in registrado por engano. */
    undoCheckIn(session: AuthSession, id: string): Promise<EventRegistration>;
    remove(session: AuthSession, id: string): Promise<void>;
  };

  // Cronograma operacional (Fase 2) -----------------------------------------
  schedule: {
    listByEvent(session: AuthSession, eventId: string): Promise<ScheduleItem[]>;
    create(
      session: AuthSession,
      input: Omit<ScheduleItem, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<ScheduleItem>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<ScheduleItem, "id" | "companyId" | "eventId">>,
    ): Promise<ScheduleItem>;
    remove(session: AuthSession, id: string): Promise<void>;
  };

  // Documentos do evento (Fase 2) --------------------------------------------
  documents: {
    listByEvent(
      session: AuthSession,
      eventId: string,
      options?: { includeArchived?: boolean },
    ): Promise<EventDocument[]>;
    create(
      session: AuthSession,
      input: Omit<EventDocument, "id" | "companyId" | "status" | "createdAt" | "updatedAt" | "arquivadoEm">,
    ): Promise<EventDocument>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<EventDocument, "id" | "companyId" | "eventId" | "status" | "arquivadoEm">>,
    ): Promise<EventDocument>;
    /** Exclusão lógica (docs/FASE_02_GESTAO.md seção 5) — nunca remove a linha fisicamente. */
    archive(session: AuthSession, id: string): Promise<EventDocument>;
    restore(session: AuthSession, id: string): Promise<EventDocument>;
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

  // Financeiro detalhado — itens de orçamento (Fase 2) ------------------------
  budgetItems: {
    listByEvent(session: AuthSession, eventId: string): Promise<BudgetItem[]>;
    create(
      session: AuthSession,
      input: Omit<BudgetItem, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<BudgetItem>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<BudgetItem, "id" | "companyId" | "eventId">>,
    ): Promise<BudgetItem>;
    remove(session: AuthSession, id: string): Promise<void>;
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

  // Riscos registrados (Fase 2 - Central de Operação) — registrados
  // manualmente por quem planeja o evento, diferente das notificações
  // computadas abaixo (ver EventRisk em domain/types.ts). -------------------
  risks: {
    listByEvent(session: AuthSession, eventId: string): Promise<EventRisk[]>;
    create(
      session: AuthSession,
      input: Omit<EventRisk, "id" | "companyId" | "createdAt" | "updatedAt">,
    ): Promise<EventRisk>;
    update(
      session: AuthSession,
      id: string,
      input: Partial<Omit<EventRisk, "id" | "companyId" | "eventId">>,
    ): Promise<EventRisk>;
    remove(session: AuthSession, id: string): Promise<void>;
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
    /**
     * Contagem agregada de interações recentes (ex: "interacao_ia"), usada
     * defensivamente pelo próprio sistema para rate limiting (Fase 3 -
     * docs/FASE_03_ATLAS.md seção 13). Deliberadamente sem "view_audit":
     * não expõe conteúdo de nenhum registro, só contagens — diferente de
     * audit.list(), que é a consulta de auditoria de verdade.
     * onlyBillable=true conta só registros com metadados.consomeCota=true
     * — falhas de configuração/autenticação/infraestrutura são auditadas
     * mas não devem consumir a cota funcional diária do usuário.
     */
    countInteractions(
      session: AuthSession,
      filters: { acao: AuditAction; sinceIso: string; onlyBillable: boolean },
    ): Promise<{ totalCompany: number; totalUser: number }>;
  };

  // Dashboard / relatórios --------------------------------------------------
  dashboard: {
    get(session: AuthSession, period?: DashboardPeriod): Promise<DashboardData>;
  };

  // Notificações internas (Fase 2) — computadas a cada consulta, nunca
  // persistidas (ver NotificationItem em domain/types.ts). ------------------
  notifications: {
    list(session: AuthSession): Promise<NotificationItem[]>;
  };

  // Relatórios avançados (Fase 2) — agregados computados a cada consulta,
  // sem tabela nova (ver AdvancedReportsData acima). ------------------------
  reports: {
    getAdvanced(session: AuthSession): Promise<AdvancedReportsData>;
  };
}
