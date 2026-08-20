import type { ComplexityFactors, ComplexityLevel } from "./types";

/**
 * Regra de negócio RN08 - Complexidade.
 *
 * A classificação deve ser derivada de esforço e impacto conforme regra
 * centralizada (não deve ficar espalhada pela interface). Cada fator é
 * informado em uma escala de 0 a 3 (nenhum, baixo, médio, alto).
 */

export const EFFORT_FACTOR_KEYS = [
  "publicoAlvo",
  "tipoEspaco",
  "faixaAtivacoes",
  "pacoteServicos",
  "contratacao",
  "legislacao",
  "jornadaParticipante",
] as const;

export const IMPACT_FACTOR_KEYS = [
  "tipoPublico",
  "autoridades",
  "cerimonial",
  "estrategico",
] as const;

export const FACTOR_SCALE_MAX = 3;

export const FACTOR_LABELS: Record<keyof ComplexityFactors, string> = {
  publicoAlvo: "Público-alvo",
  tipoEspaco: "Tipo de espaço",
  faixaAtivacoes: "Faixa de ativações",
  pacoteServicos: "Pacote de serviços",
  contratacao: "Contratação",
  legislacao: "Legislação",
  jornadaParticipante: "Jornada do participante",
  tipoPublico: "Tipo de público",
  autoridades: "Autoridades",
  cerimonial: "Solenidade / cerimonial",
  estrategico: "Evento estratégico",
};

export function defaultComplexityFactors(): ComplexityFactors {
  return {
    publicoAlvo: 0,
    tipoEspaco: 0,
    faixaAtivacoes: 0,
    pacoteServicos: 0,
    contratacao: 0,
    legislacao: 0,
    jornadaParticipante: 0,
    tipoPublico: 0,
    autoridades: 0,
    cerimonial: 0,
    estrategico: 0,
  };
}

export interface ComplexityResult {
  esforco: number;
  impacto: number;
  pontuacao: number;
  nivel: ComplexityLevel;
}

/**
 * Calcula esforço, impacto, pontuação final e nível de complexidade a
 * partir dos fatores informados. Função pura e centralizada: qualquer
 * tela que precise exibir ou recalcular complexidade deve chamar esta
 * função, nunca reimplementar a fórmula.
 */
export function calculateComplexity(
  factors: ComplexityFactors,
): ComplexityResult {
  const esforco = EFFORT_FACTOR_KEYS.reduce(
    (sum, key) => sum + (factors[key] ?? 0),
    0,
  );
  const impacto = IMPACT_FACTOR_KEYS.reduce(
    (sum, key) => sum + (factors[key] ?? 0),
    0,
  );

  const maxEsforco = EFFORT_FACTOR_KEYS.length * FACTOR_SCALE_MAX;
  const maxImpacto = IMPACT_FACTOR_KEYS.length * FACTOR_SCALE_MAX;

  // Pontuação pondera esforço e impacto igualmente, normalizada em 0-100.
  const pontuacao = Math.round(
    ((esforco / maxEsforco) * 0.5 + (impacto / maxImpacto) * 0.5) * 100,
  );

  const nivel = levelFromScore(pontuacao);

  return { esforco, impacto, pontuacao, nivel };
}

function levelFromScore(pontuacao: number): ComplexityLevel {
  if (pontuacao >= 75) return "critica";
  if (pontuacao >= 50) return "alta";
  if (pontuacao >= 25) return "media";
  return "baixa";
}

export const COMPLEXITY_LEVEL_LABELS: Record<ComplexityLevel, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};
