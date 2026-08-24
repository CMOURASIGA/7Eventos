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
 * Motor de riscos (docs/FASE_03_ATLAS.md seção 6) — sinais detectados de
 * forma determinística por riskEngine.ts, nunca pelo modelo (princípio
 * "não colocar regras críticas apenas no prompt", seção 12). O modelo só
 * recebe esta lista pronta e a usa para responder/priorizar — não inventa
 * riscos além dela.
 */
export type AtlasRiskSeverity = "baixa" | "media" | "alta" | "critica";

export interface AtlasDetectedRisk {
  /** Chave estável do tipo de sinal (ex: "tarefa_atrasada") — não muda entre execuções. */
  codigo: string;
  descricao: string;
  severidade: AtlasRiskSeverity;
  evidencia: string;
  impacto: string;
  recomendacao: string;
}

/**
 * Análise financeira aprofundada (docs/FASE_03_ATLAS.md seção 8) —
 * também determinística (financialEngine.ts). "Previsto x contratado x
 * realizado" é lido por categoria de item de orçamento como cotado
 * (estimativa inicial) x contratado x realizado — os três estágios que já
 * existem no domínio de BudgetItem, sem precisar de um "previsto por
 * categoria" que o produto não modela.
 */
export interface AtlasFinancialCategoryBreakdown {
  categoria: string;
  cotado: number;
  contratado: number;
  realizado: number;
  /** (contratado - cotado) / cotado * 100. null quando não há valor cotado para comparar. */
  variacaoContratadoCotadoPercentual: number | null;
  /** true quando contratado ou realizado já superou o valor cotado desta categoria. */
  acimaDoCotado: boolean;
}

export interface AtlasFinancialAnalysis {
  porCategoria: AtlasFinancialCategoryBreakdown[];
  categoriasAcimaDoPrevisto: string[];
  concentracao: { categoria: string; percentualDoTotal: number } | null;
  indicadores: {
    percentualExecutado: number | null;
    saldoRealizado: number;
    ticketMedioPorItem: number | null;
    itensSemValorRealizado: number;
  };
  /** Observações objetivas, nunca aconselhamento financeiro fora do escopo operacional do evento (regra explícita da seção 8). */
  pontosDeAtencao: string[];
}

/**
 * Próximas ações sugeridas (docs/FASE_03_ATLAS.md seção 7) — também
 * determinísticas (actionEngine.ts), derivadas dos mesmos dados brutos
 * que alimentam o motor de riscos. Apenas sugestão: nada aqui vira tarefa
 * automaticamente (regra explícita da seção 7 — exige confirmação humana
 * em outro fluxo, esta fatia não escreve nada).
 */
export interface AtlasSuggestedAction {
  acao: string;
  prioridade: AtlasRiskSeverity;
  justificativa: string;
  prazoSugerido: string;
  /** Nome resolvido, não o id — o modelo/UI nunca recebem ids internos. null quando não há base para sugerir alguém. */
  responsavelSugerido: string | null;
}

/**
 * Preparação operacional / briefing (docs/FASE_03_ATLAS.md seção 9) —
 * assim como o motor de riscos, é montado de forma determinística
 * (briefingEngine.ts) a partir de dados já autorizados: nenhum campo
 * aqui é gerado pelo modelo. Ao contrário de AtlasContext, não é
 * "achatado" para consumo do modelo — é o documento final que a UI
 * renderiza diretamente, então carrega nomes e listas completas (dentro
 * de um único evento, nunca entre empresas).
 */
export interface AtlasBriefingAgendaItem {
  inicio: string;
  fim: string;
  observacao?: string;
}

export interface AtlasBriefingEquipeItem {
  nome: string;
  funcao: string;
  status: string;
}

export interface AtlasBriefingFornecedorItem {
  nome: string;
  servico: string;
  situacao: string;
  contato: string | null;
}

export interface AtlasBriefingCronogramaItem {
  titulo: string;
  inicio: string;
  fim: string;
  responsavel: string | null;
  status: string;
}

export interface AtlasBriefingChecklistItem {
  titulo: string;
  categoria: string;
  status: string;
  prazo: string | null;
}

export interface AtlasBriefingContato {
  nome: string;
  papel: string;
  contato: string | null;
}

export interface AtlasBriefing {
  evento: {
    titulo: string;
    status: string;
    categoria: string;
    objetivo: string | null;
    publicoAlvo: string | null;
  };
  espaco: { nome: string; local: string; capacidade: number } | null;
  agenda: AtlasBriefingAgendaItem[];
  equipe: AtlasBriefingEquipeItem[];
  fornecedores: AtlasBriefingFornecedorItem[];
  cronograma: AtlasBriefingCronogramaItem[];
  checklist: AtlasBriefingChecklistItem[];
  participantes: { inscritos: number; confirmados: number };
  riscos: AtlasDetectedRisk[];
  orcamento: { orcamentoPrevisto: number; comprometido: number; realizado: number } | null;
  contatosEssenciais: AtlasBriefingContato[];
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
  /** Sinais de risco detectados mecanicamente (seção 6) — fonte única de verdade sobre riscos para o modelo. */
  riscosDetectados: AtlasDetectedRisk[];
  /** Ações sugeridas derivadas dos mesmos sinais (seção 7). */
  acoesSugeridas: AtlasSuggestedAction[];
  /** Análise financeira aprofundada (seção 8). null quando a sessão não tem view_financials — mesma regra do campo "financeiro". */
  financeiroDetalhado: AtlasFinancialAnalysis | null;
}

export interface AtlasChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AtlasAnswer {
  resposta: string;
}
