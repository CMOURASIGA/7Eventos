import type {
  AuditLog,
  Budget,
  ChecklistItem,
  Company,
  ComplexityAssessment,
  EventEntity,
  EventSession,
  Reservation,
  Space,
  StatusHistoryEntry,
  User,
} from "@/lib/domain/types";

/**
 * Mapeadores entre as colunas snake_case do Postgres (ver
 * supabase/migrations/0001_initial_schema.sql) e os tipos de domínio
 * camelCase usados pela UI. Mantém o schema físico livre para evoluir
 * sem vazar convenção de banco para o restante da aplicação.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function mapCompany(r: Row): Company {
  return {
    id: r.id,
    razaoSocial: r.razao_social,
    nomeFantasia: r.nome_fantasia,
    documento: r.documento,
    status: r.status,
    configuracoes: r.configuracoes ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapUser(r: Row): User {
  return {
    id: r.id,
    companyId: r.company_id,
    nome: r.nome,
    email: r.email,
    perfil: r.perfil,
    status: r.status,
    avatarColor: r.avatar_color ?? "#1d4ed8",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapSpace(r: Row): Space {
  return {
    id: r.id,
    companyId: r.company_id,
    nome: r.nome,
    local: r.local,
    capacidade: r.capacidade,
    status: r.status,
    descricao: r.descricao ?? undefined,
    caracteristicas: r.caracteristicas ?? [],
    equipamentos: r.equipamentos ?? [],
    observacoes: r.observacoes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapEvent(r: Row): EventEntity {
  return {
    id: r.id,
    companyId: r.company_id,
    titulo: r.titulo,
    descricao: r.descricao ?? undefined,
    tematica: r.tematica ?? undefined,
    categoria: r.categoria,
    status: r.status,
    responsavelId: r.responsavel_id,
    demandante: r.demandante,
    contatoDemandante: r.contato_demandante ?? undefined,
    tipoLocalizacao: r.tipo_localizacao,
    local: r.local ?? undefined,
    spaceId: r.space_id ?? undefined,
    formato: r.formato ?? undefined,
    escopo: r.escopo ?? undefined,
    segmento: r.segmento ?? undefined,
    classificacao: r.classificacao ?? undefined,
    publicoAlvo: r.publico_alvo ?? undefined,
    restrito: r.restrito,
    detalhesPlanejamento: r.detalhes_planejamento ?? undefined,
    jornadaParticipante: r.jornada_participante ?? undefined,
    estrategico: r.estrategico,
    previstoOrcamento: r.previsto_orcamento,
    frequencia: r.frequencia ?? undefined,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

export function eventToRow(e: Partial<EventEntity>): Row {
  const row: Row = {};
  if (e.companyId !== undefined) row.company_id = e.companyId;
  if (e.titulo !== undefined) row.titulo = e.titulo;
  if (e.descricao !== undefined) row.descricao = e.descricao;
  if (e.tematica !== undefined) row.tematica = e.tematica;
  if (e.categoria !== undefined) row.categoria = e.categoria;
  if (e.status !== undefined) row.status = e.status;
  if (e.responsavelId !== undefined) row.responsavel_id = e.responsavelId;
  if (e.demandante !== undefined) row.demandante = e.demandante;
  if (e.contatoDemandante !== undefined) row.contato_demandante = e.contatoDemandante;
  if (e.tipoLocalizacao !== undefined) row.tipo_localizacao = e.tipoLocalizacao;
  if (e.local !== undefined) row.local = e.local;
  if (e.spaceId !== undefined) row.space_id = e.spaceId;
  if (e.formato !== undefined) row.formato = e.formato;
  if (e.escopo !== undefined) row.escopo = e.escopo;
  if (e.segmento !== undefined) row.segmento = e.segmento;
  if (e.classificacao !== undefined) row.classificacao = e.classificacao;
  if (e.publicoAlvo !== undefined) row.publico_alvo = e.publicoAlvo;
  if (e.restrito !== undefined) row.restrito = e.restrito;
  if (e.detalhesPlanejamento !== undefined) row.detalhes_planejamento = e.detalhesPlanejamento;
  if (e.jornadaParticipante !== undefined) row.jornada_participante = e.jornadaParticipante;
  if (e.estrategico !== undefined) row.estrategico = e.estrategico;
  if (e.previstoOrcamento !== undefined) row.previsto_orcamento = e.previstoOrcamento;
  if (e.frequencia !== undefined) row.frequencia = e.frequencia;
  if (e.createdBy !== undefined) row.created_by = e.createdBy;
  if (e.updatedBy !== undefined) row.updated_by = e.updatedBy;
  return row;
}

export function mapEventSession(r: Row): EventSession {
  return {
    id: r.id,
    eventId: r.event_id,
    inicio: r.inicio,
    fim: r.fim,
    observacao: r.observacao ?? undefined,
  };
}

export function mapReservation(r: Row): Reservation {
  return {
    id: r.id,
    companyId: r.company_id,
    eventId: r.event_id ?? null,
    spaceId: r.space_id,
    inicio: r.inicio,
    fim: r.fim,
    quantidadePessoas: r.quantidade_pessoas ?? undefined,
    motivo: r.motivo,
    status: r.status,
    solicitanteId: r.solicitante_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapChecklistItem(r: Row): ChecklistItem {
  return {
    id: r.id,
    companyId: r.company_id,
    eventId: r.event_id,
    titulo: r.titulo,
    categoria: r.categoria ?? "",
    responsavelId: r.responsavel_id ?? undefined,
    prazo: r.prazo ?? undefined,
    status: r.status,
    observacao: r.observacao ?? undefined,
    concluidoEm: r.concluido_em ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapBudget(r: Row): Budget {
  return {
    id: r.id,
    companyId: r.company_id,
    eventId: r.event_id,
    valorPrevisto: Number(r.valor_previsto),
    observacoes: r.observacoes ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapComplexity(r: Row): ComplexityAssessment {
  return {
    id: r.id,
    companyId: r.company_id,
    eventId: r.event_id,
    fatores: r.fatores,
    esforco: r.esforco,
    impacto: r.impacto,
    pontuacao: r.pontuacao,
    nivel: r.nivel,
    createdAt: r.created_at,
  };
}

export function mapAuditLog(r: Row): AuditLog {
  return {
    id: r.id,
    companyId: r.company_id,
    userId: r.user_id,
    acao: r.acao,
    entidade: r.entidade,
    entidadeId: r.entidade_id,
    descricao: r.descricao,
    metadados: r.metadados ?? undefined,
    createdAt: r.created_at,
  };
}

export function mapStatusHistory(r: Row): StatusHistoryEntry {
  return {
    id: r.id,
    companyId: r.company_id,
    eventId: r.event_id,
    statusAnterior: r.status_anterior,
    statusNovo: r.status_novo,
    userId: r.user_id,
    createdAt: r.created_at,
  };
}
