import { NextResponse, type NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { can } from "@/lib/domain/permissions";

/**
 * Exportação CSV do relatório de eventos (docs/FASE_01_MVP.md, seção 14:
 * "a arquitetura deve permitir futura exportação em PDF/Excel/CSV").
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!can(session.perfil, "view_reports")) {
    return NextResponse.json({ error: "Sem permissão para exportar relatórios." }, { status: 403 });
  }

  const repository = getRepository();
  const { searchParams } = new URL(request.url);

  const events = await repository.events.search(session, {
    dataInicial: searchParams.get("dataInicial") ? new Date(searchParams.get("dataInicial")!).toISOString() : undefined,
    dataFinal: searchParams.get("dataFinal") ? new Date(searchParams.get("dataFinal")!).toISOString() : undefined,
    status: (searchParams.get("status") as never) || undefined,
    complexidade: searchParams.get("complexidade") || undefined,
    spaceId: searchParams.get("spaceId") || undefined,
    demandante: searchParams.get("demandante") || undefined,
    estrategico: searchParams.get("estrategico") ? searchParams.get("estrategico") === "true" : undefined,
  });

  const header = ["Título", "Demandante", "Categoria", "Status", "Estratégico", "Atualizado em"];
  const rows = events.map((e) => [
    csvEscape(e.titulo),
    csvEscape(e.demandante),
    csvEscape(e.categoria),
    csvEscape(EVENT_STATUS_LABELS[e.status]),
    e.estrategico ? "Sim" : "Não",
    new Date(e.updatedAt).toLocaleString("pt-BR"),
  ]);

  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-eventos.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
