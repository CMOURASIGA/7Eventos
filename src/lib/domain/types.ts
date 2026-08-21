/**
 * Tipos de domínio do 7Eventos - Fase 1 (Fundação e MVP)
 *
 * Fonte de verdade funcional: docs/7EVENTOS_SPEC.md e docs/FASE_01_MVP.md
 *
 * Estes tipos são compartilhados pelas duas implementações de dados
 * (mock em memória, para demonstração, e Supabase/Postgres, para o
 * ambiente oficial). Nenhuma tela deve depender de detalhes da fonte
 * de dados: sempre passar pelos repositórios em `src/lib/data`.
 */

export type Role =
  | "superadmin"
  | "admin_empresa"
  | "gestor_eventos"
  | "operador"
  | "consulta";

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadministrador Consult Services",
  admin_empresa: "Administrador da empresa",
  gestor_eventos: "Gestor de eventos",
  operador: "Operador / Organizador",
  consulta: "Consulta",
};

export type UserStatus = "ativo" | "inativo";

export interface Company {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  documento: string;
  status: "ativa" | "suspensa";
  configuracoes: {
    corPrimaria?: string;
    fusoHorario: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string | null; // null apenas para superadmin
  nome: string;
  email: string;
  perfil: Role;
  status: UserStatus;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus =
  | "rascunho"
  | "planejamento"
  | "aguardando_aprovacao"
  | "confirmado"
  | "em_execucao"
  | "concluido"
  | "cancelado";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  aguardando_aprovacao: "Aguardando aprovação",
  confirmado: "Confirmado",
  em_execucao: "Em execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type LocationType = "interno" | "externo";

export interface EventSession {
  id: string;
  eventId: string;
  inicio: string; // ISO datetime
  fim: string; // ISO datetime
  observacao?: string;
}

export interface EventEntity {
  id: string;
  companyId: string;
  titulo: string;
  descricao?: string;
  tematica?: string;
  categoria: string;
  status: EventStatus;
  responsavelId: string;
  demandante: string;
  contatoDemandante?: string;

  // Localização
  tipoLocalizacao: LocationType;
  local?: string;
  spaceId?: string;
  formato?: "presencial" | "online" | "hibrido";

  // Planejamento
  escopo?: string;
  segmento?: string;
  classificacao?: string;
  publicoAlvo?: string;
  restrito: boolean;
  detalhesPlanejamento?: string;
  jornadaParticipante?: string;
  estrategico: boolean;
  previstoOrcamento: boolean;

  // Frequência (quando aplicável a múltiplas sessões recorrentes)
  frequencia?: "unico" | "diario" | "semanal" | "mensal";

  // Governança
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type SpaceStatus = "ativo" | "inativo";

export interface Space {
  id: string;
  companyId: string;
  nome: string;
  local: string;
  capacidade: number;
  status: SpaceStatus;
  descricao?: string;
  caracteristicas: string[];
  equipamentos: string[];
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus =
  | "solicitada"
  | "confirmada"
  | "cancelada"
  | "concluida";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  concluida: "Concluída",
};

export interface Reservation {
  id: string;
  companyId: string;
  eventId?: string | null; // opcional até conversão em evento
  spaceId: string;
  inicio: string;
  fim: string;
  quantidadePessoas?: number;
  motivo: string;
  status: ReservationStatus;
  solicitanteId: string;
  createdAt: string;
  updatedAt: string;
}

export type ChecklistStatus =
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "bloqueado"
  | "cancelado";

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  bloqueado: "Bloqueado",
  cancelado: "Cancelado",
};

export interface ChecklistItem {
  id: string;
  companyId: string;
  eventId: string;
  titulo: string;
  categoria: string;
  responsavelId?: string;
  prazo?: string;
  status: ChecklistStatus;
  observacao?: string;
  concluidoEm?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  companyId: string;
  eventId: string;
  valorPrevisto: number;
  observacoes?: string;
  status: "previsto" | "em_analise" | "aprovado";
  createdAt: string;
  updatedAt: string;
}

export interface ComplexityFactors {
  publicoAlvo: number;
  tipoEspaco: number;
  faixaAtivacoes: number;
  pacoteServicos: number;
  contratacao: number;
  legislacao: number;
  jornadaParticipante: number;
  tipoPublico: number;
  autoridades: number;
  cerimonial: number;
  estrategico: number;
}

export type ComplexityLevel = "baixa" | "media" | "alta" | "critica";

export interface ComplexityAssessment {
  id: string;
  companyId: string;
  eventId: string;
  fatores: ComplexityFactors;
  esforco: number;
  impacto: number;
  pontuacao: number;
  nivel: ComplexityLevel;
  createdAt: string;
}

export type AuditAction =
  | "criacao"
  | "edicao"
  | "alteracao_status"
  | "reserva"
  | "cancelamento"
  | "conclusao"
  | "login"
  | "administrativo";

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  acao: AuditAction;
  entidade: string;
  entidadeId: string;
  descricao: string;
  metadados?: Record<string, unknown>;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  companyId: string;
  eventId: string;
  statusAnterior: EventStatus | null;
  statusNovo: EventStatus;
  userId: string;
  createdAt: string;
}

/** Sessão autenticada usada pela camada de autorização. */
export interface AuthSession {
  userId: string;
  companyId: string | null;
  perfil: Role;
}

/**
 * Fase 2 - Gestão Completa do Evento (docs/FASE_02_GESTAO.md)
 *
 * Fatia 1: Fornecedores + Equipe.
 */

export type SupplierStatus = "ativo" | "inativo";

/** Catálogo de fornecedores da empresa (independente de evento). */
export interface Supplier {
  id: string;
  companyId: string;
  nome: string;
  documento?: string;
  categoria: string;
  contato?: string;
  servicos?: string;
  status: SupplierStatus;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventSupplierSituacao = "previsto" | "contratado" | "confirmado" | "concluido" | "cancelado";

export const EVENT_SUPPLIER_SITUACAO_LABELS: Record<EventSupplierSituacao, string> = {
  previsto: "Previsto",
  contratado: "Contratado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Vínculo de um fornecedor do catálogo a um evento específico. */
export interface EventSupplier {
  id: string;
  companyId: string;
  eventId: string;
  supplierId: string;
  servico: string;
  responsavelInternoId?: string;
  valorPrevisto?: number;
  valorContratado?: number;
  situacao: EventSupplierSituacao;
  dataInicio?: string;
  dataFim?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TeamMemberStatus = "convidado" | "confirmado" | "em_atividade" | "concluido" | "cancelado";

export const TEAM_MEMBER_STATUS_LABELS: Record<TeamMemberStatus, string> = {
  convidado: "Convidado",
  confirmado: "Confirmado",
  em_atividade: "Em atividade",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Membro da equipe operacional alocado a um evento (usuário já cadastrado na empresa). */
export interface EventTeamMember {
  id: string;
  companyId: string;
  eventId: string;
  userId: string;
  funcao: string;
  responsabilidade?: string;
  escala?: string;
  status: TeamMemberStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fase 2 - Gestão Completa do Evento (docs/FASE_02_GESTAO.md)
 *
 * Fatia 2: Cronograma operacional + Documentos.
 */

export type ScheduleItemStatus = "pendente" | "em_andamento" | "concluido" | "cancelado";

export const SCHEDULE_ITEM_STATUS_LABELS: Record<ScheduleItemStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type ScheduleItemPriority = "baixa" | "media" | "alta";

export const SCHEDULE_ITEM_PRIORITY_LABELS: Record<ScheduleItemPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

/**
 * Atividade do cronograma operacional de um evento. "Atrasada" e
 * "próxima" (docs/FASE_02_GESTAO.md seção 4) não são status persistidos
 * — são derivados na UI a partir de `fim`/`inicio` e do `status` atual,
 * igual ao cálculo de progresso do checklist.
 */
export interface ScheduleItem {
  id: string;
  companyId: string;
  eventId: string;
  titulo: string;
  descricao?: string;
  inicio: string;
  fim: string;
  responsavelId?: string;
  /** Outra atividade do mesmo evento que precisa concluir antes desta começar. */
  dependeDeId?: string;
  prioridade: ScheduleItemPriority;
  status: ScheduleItemStatus;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventDocumentCategory =
  | "proposta"
  | "contrato"
  | "autorizacao"
  | "planta"
  | "apresentacao"
  | "briefing"
  | "evidencia"
  | "fornecedor"
  | "outros";

export const EVENT_DOCUMENT_CATEGORY_LABELS: Record<EventDocumentCategory, string> = {
  proposta: "Proposta",
  contrato: "Contrato",
  autorizacao: "Autorização",
  planta: "Planta",
  apresentacao: "Apresentação",
  briefing: "Briefing",
  evidencia: "Evidência",
  fornecedor: "Fornecedor",
  outros: "Outros",
};

export type EventDocumentStatus = "ativo" | "arquivado";

/**
 * Registro da central documental de um evento. Sem um provedor de
 * armazenamento de arquivos provisionado ainda (ver docs/FASE_02_GESTAO.md
 * seção 5 e docs/architecture/DATABASE.md), o "upload" hoje é uma
 * referência (link externo e/ou nome do arquivo) mais os metadados
 * exigidos — categoria, responsável, data, vínculo com o evento. Trocar
 * por upload binário real (Supabase Storage) no futuro não deve exigir
 * mudança de forma no restante da aplicação, só na gravação do arquivo em
 * si. `status`/`arquivadoEm` implementam a exclusão lógica pedida na spec.
 */
export interface EventDocument {
  id: string;
  companyId: string;
  eventId: string;
  categoria: EventDocumentCategory;
  titulo: string;
  descricao?: string;
  urlReferencia?: string;
  nomeArquivo?: string;
  responsavelId: string;
  status: EventDocumentStatus;
  createdAt: string;
  updatedAt: string;
  arquivadoEm?: string;
}

/**
 * Fase 2 - Gestão Completa do Evento (docs/FASE_02_GESTAO.md)
 *
 * Fatia 3: Participantes + Inscrição + Credenciamento.
 */

export type ParticipantStatus = "ativo" | "inativo";

/**
 * Cadastro de participante, por empresa e independente de evento — mesmo
 * padrão de Supplier (catálogo reaproveitável, vinculado a eventos via
 * EventRegistration). Deliberadamente sem campos além dos pedidos pela
 * spec ("evitar coleta de dados sem finalidade operacional").
 */
export interface Participant {
  id: string;
  companyId: string;
  nome: string;
  email: string;
  telefone?: string;
  organizacao?: string;
  categoria?: string;
  status: ParticipantStatus;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RegistrationStatus = "solicitada" | "confirmada" | "cancelada";

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

/**
 * Inscrição de um participante do catálogo em um evento específico
 * (docs/FASE_02_GESTAO.md seção 7). O credenciamento (seção 8) — check-in,
 * horário, presentes/ausentes — é tratado como um estado desta mesma
 * inscrição (`checkInAt`/`checkInPorId`), não uma entidade separada: só
 * faz sentido credenciar quem já está inscrito no evento, e "presentes"/
 * "ausentes" nada mais são do que inscrições confirmadas com ou sem
 * `checkInAt` preenchido.
 */
export interface EventRegistration {
  id: string;
  companyId: string;
  eventId: string;
  participantId: string;
  lote?: string;
  categoria?: string;
  status: RegistrationStatus;
  checkInAt?: string;
  /** Usuário (perfil da equipe) que registrou o check-in. */
  checkInPorId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fase 2 - Gestão Completa do Evento (docs/FASE_02_GESTAO.md)
 *
 * Fatia 4a: Financeiro detalhado — evolui o orçamento único da Fase 1
 * (`Budget`, acima) com itens de orçamento por categoria/fornecedor.
 * Reaproveita as capabilities já existentes "manage_budget" e
 * "view_financials" (nenhuma capability nova) e o mesmo `Budget` como
 * cabeçalho (valor previsto total do evento); `BudgetItem` é o
 * detalhamento linha a linha.
 */

export type BudgetItemStatus = "previsto" | "cotado" | "contratado" | "realizado" | "cancelado";

export const BUDGET_ITEM_STATUS_LABELS: Record<BudgetItemStatus, string> = {
  previsto: "Previsto",
  cotado: "Cotado",
  contratado: "Contratado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

/**
 * Item de orçamento de um evento — uma linha de custo (categoria,
 * fornecedor opcional, valores cotado/contratado/realizado). "Diferença"
 * (previsto x realizado) é sempre calculada na UI a partir destes
 * valores, nunca persistida.
 */
export interface BudgetItem {
  id: string;
  companyId: string;
  eventId: string;
  categoria: string;
  /** Vínculo opcional ao catálogo de fornecedores — nem todo item tem um fornecedor associado (ex: taxas, equipe interna). */
  supplierId?: string;
  descricao: string;
  valorCotado?: number;
  valorContratado?: number;
  valorRealizado?: number;
  status: BudgetItemStatus;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fase 2 - Gestão Completa do Evento (docs/FASE_02_GESTAO.md)
 *
 * Fatia 4b: Notificações internas (seção 11). Computadas a partir dos
 * dados já existentes (checklist, cronograma, reservas, documentos,
 * orçamento, histórico de status) a cada consulta — nunca persistidas,
 * então nunca ficam desatualizadas nem precisam de um processo em
 * segundo plano para gerá-las. "Não depender de WhatsApp/e-mail nesta
 * fase" (spec) — é um feed dentro da própria aplicação.
 */

export type NotificationType =
  | "prazo_proximo"
  | "tarefa_atrasada"
  | "reserva_alterada"
  | "documento_pendente"
  | "orcamento_excedido"
  | "atividade_bloqueada"
  | "mudanca_status";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  prazo_proximo: "Prazo próximo",
  tarefa_atrasada: "Tarefa atrasada",
  reserva_alterada: "Reserva alterada",
  documento_pendente: "Documento pendente",
  orcamento_excedido: "Orçamento excedido",
  atividade_bloqueada: "Atividade bloqueada",
  mudanca_status: "Mudança de status",
};

export type NotificationSeverity = "info" | "warning" | "danger";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  eventId: string;
  eventTitulo: string;
  titulo: string;
  /** Data/hora de referência do alerta (prazo, horário da atividade, data da mudança) — a UI formata para exibição. */
  referenceAt: string;
}

/**
 * Riscos registrados (docs/FASE_02_GESTAO.md seção 10 - Central de
 * Operação). Diferente das notificações computadas (seção 11), um risco
 * é registrado manualmente por quem planeja o evento — não é derivado
 * de outra tabela. Lista estruturada com severidade + status, conforme
 * decisão de produto (não um campo de texto livre único por evento).
 */

export type EventRiskSeverity = "baixa" | "media" | "alta" | "critica";

export const EVENT_RISK_SEVERITY_LABELS: Record<EventRiskSeverity, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export type EventRiskStatus = "aberto" | "em_mitigacao" | "mitigado" | "encerrado";

export const EVENT_RISK_STATUS_LABELS: Record<EventRiskStatus, string> = {
  aberto: "Aberto",
  em_mitigacao: "Em mitigação",
  mitigado: "Mitigado",
  encerrado: "Encerrado",
};

export interface EventRisk {
  id: string;
  companyId: string;
  eventId: string;
  titulo: string;
  descricao?: string;
  severidade: EventRiskSeverity;
  status: EventRiskStatus;
  responsavelId?: string;
  planoMitigacao?: string;
  createdAt: string;
  updatedAt: string;
}
