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
