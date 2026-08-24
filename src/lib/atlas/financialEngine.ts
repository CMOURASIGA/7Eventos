import type { BudgetItem } from "@/lib/domain/types";
import type { AtlasFinancialAnalysis, AtlasFinancialCategoryBreakdown } from "./types";

/**
 * Atlas (Fase 3) - análise financeira aprofundada (docs/FASE_03_ATLAS.md
 * seção 8). Função pura e determinística, como riskEngine.ts/actionEngine.ts:
 * nenhum número aqui vem do modelo — ele só recebe o resultado pronto e o
 * explica em texto (regra explícita da seção 8: "não oferecer
 * aconselhamento financeiro fora do contexto operacional do evento").
 *
 * "Previsto x contratado x realizado" é lido por categoria como
 * cotado (estimativa inicial) x contratado x realizado — os três
 * estágios que já existem em BudgetItem. O produto não modela um
 * "previsto por categoria" separado do previsto total do evento.
 */

const ATENCAO_MAX = 5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface FinancialEngineInput {
  /** Itens de orçamento já filtrados (ex: sem os cancelados) — mesma regra usada para orcamentoPrevisto/comprometido/realizado. */
  budgetItems: BudgetItem[];
  orcamentoPrevisto: number;
  comprometido: number;
  realizado: number;
}

export function analyzeFinancials(input: FinancialEngineInput): AtlasFinancialAnalysis {
  const { budgetItems, orcamentoPrevisto, comprometido, realizado } = input;

  const porCategoriaMap = new Map<string, { cotado: number; contratado: number; realizado: number }>();
  let itensSemValorRealizado = 0;
  for (const item of budgetItems) {
    const atual = porCategoriaMap.get(item.categoria) ?? { cotado: 0, contratado: 0, realizado: 0 };
    atual.cotado += item.valorCotado ?? 0;
    atual.contratado += item.valorContratado ?? 0;
    atual.realizado += item.valorRealizado ?? 0;
    porCategoriaMap.set(item.categoria, atual);
    if (!item.valorRealizado) itensSemValorRealizado++;
  }

  const porCategoria: AtlasFinancialCategoryBreakdown[] = Array.from(porCategoriaMap.entries())
    .map(([categoria, v]) => {
      const variacaoContratadoCotadoPercentual = v.cotado > 0 ? round2(((v.contratado - v.cotado) / v.cotado) * 100) : null;
      const acimaDoCotado = v.cotado > 0 && (v.contratado > v.cotado || v.realizado > v.cotado);
      return {
        categoria,
        cotado: round2(v.cotado),
        contratado: round2(v.contratado),
        realizado: round2(v.realizado),
        variacaoContratadoCotadoPercentual,
        acimaDoCotado,
      };
    })
    .sort((a, b) => b.realizado - a.realizado || b.contratado - a.contratado);

  const categoriasAcimaDoPrevisto = porCategoria.filter((c) => c.acimaDoCotado).map((c) => c.categoria);

  // Concentração de custo: categoria com maior participação na base
  // disponível (realizado, senão contratado, senão cotado).
  const basePorCategoria = porCategoria.map((c) => ({ categoria: c.categoria, valor: c.realizado || c.contratado || c.cotado }));
  const totalBase = basePorCategoria.reduce((sum, c) => sum + c.valor, 0);
  let concentracao: AtlasFinancialAnalysis["concentracao"] = null;
  if (totalBase > 0) {
    const top = basePorCategoria.slice().sort((a, b) => b.valor - a.valor)[0];
    if (top && top.valor > 0) {
      concentracao = { categoria: top.categoria, percentualDoTotal: round2((top.valor / totalBase) * 100) };
    }
  }

  // Valor mais concreto disponível por item (realizado > contratado > cotado), não a soma bruta — média de itens com valor 0 em todos os campos entra como 0.
  const ticketMedioPorItem =
    budgetItems.length > 0
      ? round2(budgetItems.reduce((sum, i) => sum + (i.valorRealizado ?? i.valorContratado ?? i.valorCotado ?? 0), 0) / budgetItems.length)
      : null;

  const pontosDeAtencao: string[] = [];
  if (orcamentoPrevisto > 0 && realizado > orcamentoPrevisto) {
    pontosDeAtencao.push(
      `Orçamento total já ultrapassado: realizado R$ ${round2(realizado).toFixed(2)} contra previsto R$ ${orcamentoPrevisto.toFixed(2)}.`,
    );
  } else if (orcamentoPrevisto > 0 && comprometido > orcamentoPrevisto) {
    pontosDeAtencao.push(
      `Valor contratado já ultrapassa o previsto: R$ ${round2(comprometido).toFixed(2)} contra R$ ${orcamentoPrevisto.toFixed(2)}, mesmo sem gasto realizado.`,
    );
  }
  for (const cat of porCategoria.filter((c) => c.acimaDoCotado).slice(0, 3)) {
    pontosDeAtencao.push(
      `Categoria "${cat.categoria}" acima do valor cotado: cotado R$ ${cat.cotado.toFixed(2)}, contratado R$ ${cat.contratado.toFixed(2)}, realizado R$ ${cat.realizado.toFixed(2)}.`,
    );
  }
  if (concentracao && concentracao.percentualDoTotal >= 50) {
    pontosDeAtencao.push(`Categoria "${concentracao.categoria}" concentra ${concentracao.percentualDoTotal.toFixed(0)}% do custo do evento.`);
  }
  if (comprometido > 0 && realizado === 0) {
    pontosDeAtencao.push("Há valor contratado, mas nenhum valor foi registrado como realizado ainda.");
  }

  return {
    porCategoria,
    categoriasAcimaDoPrevisto,
    concentracao,
    indicadores: {
      percentualExecutado: orcamentoPrevisto > 0 ? round2((realizado / orcamentoPrevisto) * 100) : null,
      saldoRealizado: round2(orcamentoPrevisto - realizado),
      ticketMedioPorItem,
      itensSemValorRealizado,
    },
    pontosDeAtencao: pontosDeAtencao.slice(0, ATENCAO_MAX),
  };
}
