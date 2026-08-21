/**
 * Atlas (Fase 3) - docs/FASE_03_ATLAS.md.
 *
 * Tipos do contexto estruturado montado para o modelo e das respostas
 * que ele produz. Deliberadamente "achatado": números, rótulos e listas
 * curtas — nunca os registros brutos do banco (princípio 9 "minimizar
 * contexto enviado ao modelo" e seção 13 "controle de consumo").
 */

export interface AtlasRiskSummary {
  titulo: string;
  severidade: string;
  status: string;
}

export interface AtlasPendencySummary {
  tipo: string;
  titulo: string;
  severidade: string;
}

export interface AtlasFinanceiro {
  orcamentoPrevisto: number;
  comprometido: number;
  realizado: number;
  saldoRealizado: number;
  percentualExecutado: number | null;
}

/**
 * Contexto estruturado de um evento, já filtrado pelas permissões da
 * sessão (ex: "financeiro" é omitido para quem não tem view_financials —
 * princípios 2/3 "respeitar company_id/perfil"). É isto, serializado em
 * JSON compacto, que vai para o modelo — nunca as entidades de domínio
 * inteiras.
 */
export interface AtlasContext {
  evento: {
    titulo: string;
    status: string;
    categoria: string;
    demandante: string;
    estrategico: boolean;
    complexidade: string | null;
    localizacao: string;
  };
  dataHora: { inicio: string; fim: string; totalSessoes: number } | null;
  checklist: { total: number; concluidos: number; pendentes: number; bloqueados: number; atrasados: number };
  cronograma: { total: number; concluidas: number; atrasadas: number; proximas: number };
  equipe: { total: number; porStatus: Record<string, number> };
  fornecedores: { total: number; porSituacao: Record<string, number> };
  reservas: { total: number; porStatus: Record<string, number> };
  participantes: { inscritos: number; confirmados: number; presentes: number; ausentes: number };
  documentos: { ativos: number; arquivados: number };
  riscos: { total: number; abertos: number; lista: AtlasRiskSummary[] };
  pendencias: { total: number; lista: AtlasPendencySummary[] };
  financeiro: AtlasFinanceiro | null;
  historicoRecente: { de: string | null; para: string; quando: string }[];
}

export interface AtlasChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AtlasAnswer {
  resposta: string;
}
