import type {
  ChecklistItem,
  EventEntity,
  EventSession,
  EventSupplier,
  EventTeamMember,
  ScheduleItem,
  Space,
  Supplier,
  User,
} from "@/lib/domain/types";
import type { AtlasBriefing, AtlasDetectedRisk } from "./types";

/**
 * Atlas (Fase 3) - preparação operacional / briefing (docs/FASE_03_ATLAS.md
 * seção 9). Função pura: só formata dados já coletados e já autorizados
 * (o caller — briefing.ts — decide o que cada sessão pode ver antes de
 * chamar esta função). Nenhum campo aqui é sugerido, resumido ou
 * inventado pelo modelo de IA.
 */

export interface AssembleBriefingInput {
  event: Pick<EventEntity, "titulo" | "status" | "categoria" | "descricao" | "escopo" | "publicoAlvo" | "contatoDemandante" | "demandante">;
  riscosDetectados: AtlasDetectedRisk[];
  financeiro: { orcamentoPrevisto: number; comprometido: number; realizado: number } | null;
  participantes: { inscritos: number; confirmados: number };
  sessions: EventSession[];
  space: Space | null;
  teamMembers: EventTeamMember[];
  eventSuppliers: EventSupplier[];
  suppliers: Supplier[];
  users: User[];
  scheduleItems: ScheduleItem[];
  checklist: ChecklistItem[];
}

export function assembleBriefing(input: AssembleBriefingInput): AtlasBriefing {
  const { event, riscosDetectados, financeiro, participantes, sessions, space, teamMembers, eventSuppliers, suppliers, users, scheduleItems, checklist } =
    input;

  const userNameById = new Map(users.map((u) => [u.id, u.nome]));
  const userEmailById = new Map(users.map((u) => [u.id, u.email]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const agenda = sessions
    .slice()
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((s) => ({ inicio: s.inicio, fim: s.fim, observacao: s.observacao }));

  const equipe = teamMembers
    .filter((m) => m.status !== "cancelado")
    .map((m) => ({ nome: userNameById.get(m.userId) ?? "—", funcao: m.funcao, status: m.status }));

  const fornecedores = eventSuppliers
    .filter((es) => es.situacao !== "cancelado")
    .map((es) => {
      const supplier = supplierById.get(es.supplierId);
      return {
        nome: supplier?.nome ?? "—",
        servico: es.servico,
        situacao: es.situacao,
        contato: supplier?.contato ?? null,
      };
    });

  const cronograma = scheduleItems
    .filter((s) => s.status !== "cancelado")
    .slice()
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((s) => ({
      titulo: s.titulo,
      inicio: s.inicio,
      fim: s.fim,
      responsavel: s.responsavelId ? (userNameById.get(s.responsavelId) ?? null) : null,
      status: s.status,
    }));

  const checklistOrdenado = checklist
    .filter((c) => c.status !== "cancelado")
    .slice()
    .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
    .map((c) => ({ titulo: c.titulo, categoria: c.categoria, status: c.status, prazo: c.prazo ?? null }));

  const contatosEssenciais: AtlasBriefing["contatosEssenciais"] = [];
  if (event.contatoDemandante) {
    contatosEssenciais.push({ nome: event.demandante, papel: "Demandante", contato: event.contatoDemandante });
  }
  for (const m of teamMembers.filter((m) => m.status !== "cancelado")) {
    const email = userEmailById.get(m.userId);
    if (email) contatosEssenciais.push({ nome: userNameById.get(m.userId) ?? "—", papel: m.funcao, contato: email });
  }
  for (const f of fornecedores) {
    if (f.contato) contatosEssenciais.push({ nome: f.nome, papel: f.servico, contato: f.contato });
  }

  return {
    evento: {
      titulo: event.titulo,
      status: event.status,
      categoria: event.categoria,
      objetivo: event.descricao ?? event.escopo ?? null,
      publicoAlvo: event.publicoAlvo ?? null,
    },
    espaco: space ? { nome: space.nome, local: space.local, capacidade: space.capacidade } : null,
    agenda,
    equipe,
    fornecedores,
    cronograma,
    checklist: checklistOrdenado,
    participantes,
    riscos: riscosDetectados,
    orcamento: financeiro,
    contatosEssenciais,
  };
}
