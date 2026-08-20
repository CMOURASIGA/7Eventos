import type {
  AuditLog,
  Budget,
  ChecklistItem,
  Company,
  ComplexityAssessment,
  EventEntity,
  EventSession,
  EventStatus,
  Reservation,
  Space,
  StatusHistoryEntry,
  User,
} from "@/lib/domain/types";
import { calculateComplexity } from "@/lib/domain/complexity";
import { DEMANDANTES } from "@/lib/domain/catalog";

/**
 * Gerador de base de demonstração rica para o 7Eventos.
 *
 * Usado apenas quando DATA_MODE=mock (branch `develop`, ambiente de
 * demonstração). Os dados são determinísticos (seed fixa) e mantidos em
 * memória: reiniciar o processo/servidor restaura exatamente este
 * estado inicial, conforme solicitado para o ambiente de demo.
 *
 * NUNCA deve ser usado quando DATA_MODE=supabase.
 */

// RNG determinístico (mulberry32) para reprodutibilidade entre reinicios.
function createRng(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(7202609);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function pickMany<T>(arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function intBetween(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function uid(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(4, "0")}`;
}
function isoAt(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600_000).toISOString();
}
function nowIso(offsetDays = 0): string {
  return isoAt(offsetDays, 9, 0);
}

export interface SeedData {
  companies: Company[];
  users: User[];
  spaces: Space[];
  events: EventEntity[];
  eventSessions: EventSession[];
  reservations: Reservation[];
  checklistItems: ChecklistItem[];
  budgets: Budget[];
  complexityAssessments: ComplexityAssessment[];
  statusHistory: StatusHistoryEntry[];
  auditLogs: AuditLog[];
}

export function generateSeed(): SeedData {
  const companies: Company[] = [
    {
      id: "company_consult",
      razaoSocial: "Consult Services Eventos Corporativos Ltda.",
      nomeFantasia: "Consult Eventos Brasil",
      documento: "12.345.678/0001-90",
      status: "ativa",
      configuracoes: { corPrimaria: "#1d4ed8", fusoHorario: "America/Sao_Paulo" },
      createdAt: nowIso(-400),
      updatedAt: nowIso(-10),
    },
    {
      id: "company_aurora",
      razaoSocial: "Aurora Live Experience S.A.",
      nomeFantasia: "Aurora Live",
      documento: "98.765.432/0001-10",
      status: "ativa",
      configuracoes: { corPrimaria: "#1d4ed8", fusoHorario: "America/Sao_Paulo" },
      createdAt: nowIso(-260),
      updatedAt: nowIso(-5),
    },
  ];

  const users: User[] = [
    {
      id: "user_superadmin",
      companyId: null,
      nome: "Christian Moura",
      email: "cmourasiga@gmail.com",
      perfil: "superadmin",
      status: "ativo",
      avatarColor: "#0f172a",
      createdAt: nowIso(-400),
      updatedAt: nowIso(-400),
    },
    // Consult Eventos Brasil
    {
      id: "user_consult_admin",
      companyId: "company_consult",
      nome: "Marina Azevedo",
      email: "marina.azevedo@consulteventos.com.br",
      perfil: "admin_empresa",
      status: "ativo",
      avatarColor: "#1d4ed8",
      createdAt: nowIso(-390),
      updatedAt: nowIso(-30),
    },
    {
      id: "user_consult_gestor1",
      companyId: "company_consult",
      nome: "Rafael Nogueira",
      email: "rafael.nogueira@consulteventos.com.br",
      perfil: "gestor_eventos",
      status: "ativo",
      avatarColor: "#2563eb",
      createdAt: nowIso(-380),
      updatedAt: nowIso(-20),
    },
    {
      id: "user_consult_gestor2",
      companyId: "company_consult",
      nome: "Bianca Ferreira",
      email: "bianca.ferreira@consulteventos.com.br",
      perfil: "gestor_eventos",
      status: "ativo",
      avatarColor: "#3b82f6",
      createdAt: nowIso(-370),
      updatedAt: nowIso(-15),
    },
    {
      id: "user_consult_operador1",
      companyId: "company_consult",
      nome: "Diego Martins",
      email: "diego.martins@consulteventos.com.br",
      perfil: "operador",
      status: "ativo",
      avatarColor: "#60a5fa",
      createdAt: nowIso(-360),
      updatedAt: nowIso(-9),
    },
    {
      id: "user_consult_operador2",
      companyId: "company_consult",
      nome: "Larissa Cardoso",
      email: "larissa.cardoso@consulteventos.com.br",
      perfil: "operador",
      status: "ativo",
      avatarColor: "#60a5fa",
      createdAt: nowIso(-350),
      updatedAt: nowIso(-8),
    },
    {
      id: "user_consult_consulta",
      companyId: "company_consult",
      nome: "Fernando Melo",
      email: "fernando.melo@consulteventos.com.br",
      perfil: "consulta",
      status: "ativo",
      avatarColor: "#93c5fd",
      createdAt: nowIso(-300),
      updatedAt: nowIso(-6),
    },
    // Aurora Live
    {
      id: "user_aurora_admin",
      companyId: "company_aurora",
      nome: "Patrícia Lins",
      email: "patricia.lins@auroralive.com.br",
      perfil: "admin_empresa",
      status: "ativo",
      avatarColor: "#1d4ed8",
      createdAt: nowIso(-250),
      updatedAt: nowIso(-25),
    },
    {
      id: "user_aurora_gestor1",
      companyId: "company_aurora",
      nome: "Thiago Ramos",
      email: "thiago.ramos@auroralive.com.br",
      perfil: "gestor_eventos",
      status: "ativo",
      avatarColor: "#2563eb",
      createdAt: nowIso(-240),
      updatedAt: nowIso(-18),
    },
    {
      id: "user_aurora_operador1",
      companyId: "company_aurora",
      nome: "Camila Duarte",
      email: "camila.duarte@auroralive.com.br",
      perfil: "operador",
      status: "ativo",
      avatarColor: "#60a5fa",
      createdAt: nowIso(-230),
      updatedAt: nowIso(-7),
    },
    {
      id: "user_aurora_inativo",
      companyId: "company_aurora",
      nome: "Gustavo Pires",
      email: "gustavo.pires@auroralive.com.br",
      perfil: "operador",
      status: "inativo",
      avatarColor: "#94a3b8",
      createdAt: nowIso(-220),
      updatedAt: nowIso(-100),
    },
  ];

  const spaces: Space[] = [];
  let spaceSeq = 1;
  const spaceTemplates: Record<
    string,
    { nome: string; local: string; capacidade: number; caracteristicas: string[]; equipamentos: string[] }[]
  > = {
    company_consult: [
      { nome: "Auditório Ipê", local: "Sede Consult - Torre A", capacidade: 320, caracteristicas: ["Palco", "Camarim", "Acessível"], equipamentos: ["Projetor 4K", "Sistema de som", "Microfone sem fio"] },
      { nome: "Sala Jequitibá", local: "Sede Consult - Torre A", capacidade: 40, caracteristicas: ["Formato U", "Luz natural"], equipamentos: ["TV 65\"", "Videoconferência"] },
      { nome: "Sala Cedro", local: "Sede Consult - Torre B", capacidade: 18, caracteristicas: ["Formato boardroom"], equipamentos: ["TV 55\"", "Quadro branco"] },
      { nome: "Terraço Vista Rio", local: "Sede Consult - Cobertura", capacidade: 150, caracteristicas: ["Área externa", "Vista panorâmica"], equipamentos: ["Gerador de energia", "Iluminação cênica"] },
      { nome: "Espaço Coworking", local: "Sede Consult - Térreo", capacidade: 60, caracteristicas: ["Layout flexível"], equipamentos: ["Wi-Fi dedicado", "Cafeteria"] },
      { nome: "Sala Treinamento 1", local: "Centro de Treinamento Consult", capacidade: 25, caracteristicas: ["Estações individuais"], equipamentos: ["25 notebooks", "Projetor"] },
      { nome: "Sala Treinamento 2", local: "Centro de Treinamento Consult", capacidade: 25, caracteristicas: ["Estações individuais"], equipamentos: ["25 notebooks", "Projetor"] },
    ],
    company_aurora: [
      { nome: "Arena Aurora", local: "Complexo Aurora Live", capacidade: 800, caracteristicas: ["Palco principal", "Backstage amplo"], equipamentos: ["Line array", "Telão LED", "Iluminação robótica"] },
      { nome: "Sala VIP Lounge", local: "Complexo Aurora Live", capacidade: 60, caracteristicas: ["Ambiente climatizado"], equipamentos: ["Bar equipado", "Som ambiente"] },
      { nome: "Estúdio Live", local: "Complexo Aurora Live", capacidade: 30, caracteristicas: ["Isolamento acústico"], equipamentos: ["Câmeras PTZ", "Mesa de transmissão"] },
      { nome: "Galpão Eventos Externos", local: "Distrito Criativo", capacidade: 500, caracteristicas: ["Pé direito alto", "Doca de carga"], equipamentos: ["Climatização industrial"] },
      { nome: "Sala Reunião Norte", local: "Escritório Aurora", capacidade: 12, caracteristicas: ["Boardroom"], equipamentos: ["TV 55\""] },
    ],
  };

  for (const [companyId, templates] of Object.entries(spaceTemplates)) {
    for (const t of templates) {
      const inactive = rng() < 0.12;
      spaces.push({
        id: uid("space", spaceSeq++),
        companyId,
        nome: t.nome,
        local: t.local,
        capacidade: t.capacidade,
        status: inactive ? "inativo" : "ativo",
        descricao: `Espaço utilizado para eventos ${inactive ? "(atualmente inativo para reformas)" : "corporativos e institucionais"}.`,
        caracteristicas: t.caracteristicas,
        equipamentos: t.equipamentos,
        observacoes: inactive ? "Inativado até conclusão de manutenção predial." : undefined,
        createdAt: nowIso(-intBetween(200, 380)),
        updatedAt: nowIso(-intBetween(1, 60)),
      });
    }
  }

  const spacesByCompany = (companyId: string) =>
    spaces.filter((s) => s.companyId === companyId);

  // Cada evento tem título, categoria e temática coerentes entre si (evita
  // combinações estranhas como "Show de Encerramento" categorizado como
  // "Treinamento"). O pool tem exatamente o total de eventos gerados
  // (18 + 12 = 30) e é consumido sem reposição, então nenhum título se
  // repete entre as duas empresas de demonstração.
  interface EventTemplate {
    titulo: string;
    categoria: string;
    tematica: string;
  }
  const EVENT_TEMPLATES: EventTemplate[] = [
    { titulo: "Convenção Anual de Parceiros", categoria: "Convenção", tematica: "Vendas" },
    { titulo: "Workshop de Liderança Consultiva", categoria: "Treinamento", tematica: "Liderança" },
    { titulo: "Lançamento da Plataforma Digital", categoria: "Lançamento de produto", tematica: "Tecnologia" },
    { titulo: "Encontro de Integração de Novos Colaboradores", categoria: "Institucional", tematica: "Integração" },
    { titulo: "Fórum de Sustentabilidade Corporativa", categoria: "Institucional", tematica: "Sustentabilidade" },
    { titulo: "Treinamento de Vendas Consultivas", categoria: "Treinamento", tematica: "Vendas" },
    { titulo: "Cerimônia de Premiação Anual", categoria: "Cerimônia", tematica: "Liderança" },
    { titulo: "Summit de Inovação e Tecnologia", categoria: "Convenção", tematica: "Inovação" },
    { titulo: "Reunião Estratégica de Diretoria", categoria: "Institucional", tematica: "Liderança" },
    { titulo: "Festa de Confraternização de Fim de Ano", categoria: "Confraternização", tematica: "Aniversário da empresa" },
    { titulo: "Roadshow Regional Sul", categoria: "Comercial", tematica: "Vendas" },
    { titulo: "Painel de Diversidade e Inclusão", categoria: "Institucional", tematica: "Diversidade e inclusão" },
    { titulo: "Capacitação em Compliance", categoria: "Treinamento", tematica: "Liderança" },
    { titulo: "Evento de Relacionamento com Clientes VIP", categoria: "Comercial", tematica: "Vendas" },
    { titulo: "Hackathon Interno de Inovação", categoria: "Institucional", tematica: "Inovação" },
    { titulo: "Assembleia Geral de Acionistas", categoria: "Institucional", tematica: "Liderança" },
    { titulo: "Feira de Carreiras", categoria: "Institucional", tematica: "Integração" },
    { titulo: "Congresso Setorial", categoria: "Convenção", tematica: "Inovação" },
    { titulo: "Show de Encerramento de Temporada", categoria: "Cultural", tematica: "Aniversário da empresa" },
    { titulo: "Coletiva de Imprensa - Novo Produto", categoria: "Lançamento de produto", tematica: "Tecnologia" },
    { titulo: "Café com o Presidente", categoria: "Institucional", tematica: "Liderança" },
    { titulo: "Semana de Inovação Aberta", categoria: "Cultural", tematica: "Inovação" },
    { titulo: "Rodada de Negócios com Fornecedores", categoria: "Comercial", tematica: "Vendas" },
    { titulo: "Onboarding de Novos Gestores", categoria: "Treinamento", tematica: "Liderança" },
    { titulo: "Circuito de Bem-Estar Corporativo", categoria: "Institucional", tematica: "Diversidade e inclusão" },
    { titulo: "Lançamento do Relatório de Sustentabilidade", categoria: "Institucional", tematica: "Sustentabilidade" },
    { titulo: "Encontro Nacional de Franqueados", categoria: "Convenção", tematica: "Vendas" },
    { titulo: "Maratona de Tecnologia e Dados", categoria: "Treinamento", tematica: "Tecnologia" },
    { titulo: "Cerimônia de Formatura do Programa Trainee", categoria: "Cerimônia", tematica: "Integração" },
    { titulo: "Retiro de Planejamento Estratégico", categoria: "Institucional", tematica: "Liderança" },
  ];
  // Fisher-Yates com o RNG determinístico da seed, para consumir o pool
  // em ordem embaralhada mas reprodutível.
  const templateQueue = [...EVENT_TEMPLATES];
  for (let i = templateQueue.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [templateQueue[i], templateQueue[j]] = [templateQueue[j], templateQueue[i]];
  }

const STATUS_CYCLE: EventStatus[] = [
  "rascunho",
  "planejamento",
  "aguardando_aprovacao",
  "confirmado",
  "em_execucao",
  "concluido",
  "cancelado",
];

  const events: EventEntity[] = [];
  const eventSessions: EventSession[] = [];
  const reservations: Reservation[] = [];
  const checklistItems: ChecklistItem[] = [];
  const budgets: Budget[] = [];
  const complexityAssessments: ComplexityAssessment[] = [];
  const statusHistory: StatusHistoryEntry[] = [];
  const auditLogs: AuditLog[] = [];

  const seq = { event: 1, session: 1, reservation: 1, checklist: 1, budget: 1, complexity: 1, history: 1, audit: 1 };

  const companyConfigs = [
    { companyId: "company_consult", managers: ["user_consult_gestor1", "user_consult_gestor2"], admin: "user_consult_admin", operators: ["user_consult_operador1", "user_consult_operador2"], count: 18 },
    { companyId: "company_aurora", managers: ["user_aurora_gestor1"], admin: "user_aurora_admin", operators: ["user_aurora_operador1"], count: 12 },
  ];

  for (const cfg of companyConfigs) {
    const companySpaces = spacesByCompany(cfg.companyId);
    for (let i = 0; i < cfg.count; i++) {
      const dayOffset = intBetween(-60, 90);
      const isPast = dayOffset < 0;
      const status: EventStatus = isPast
        ? pick(["concluido", "concluido", "concluido", "cancelado"] as const)
        : pick(["rascunho", "planejamento", "aguardando_aprovacao", "confirmado", "confirmado"] as const);
      const finalStatus =
        dayOffset >= -1 && dayOffset <= 1 && !isPast ? "em_execucao" : status;

      const responsavel = pick(cfg.managers);
      const space = rng() < 0.85 ? pick(companySpaces) : undefined;
      const startHour = intBetween(8, 18);
      const duracaoHoras = intBetween(2, 8);
      const inicio = isoAt(dayOffset, startHour);
      const fim = addHours(inicio, duracaoHoras);
      const multiSessao = rng() < 0.25;
      const estrategico = rng() < 0.3;
      const previstoOrcamento = rng() < 0.75;
      const template = templateQueue.pop()!;
      const { titulo, categoria, tematica } = template;
      const demandante = pick(DEMANDANTES);

      const eventId = uid("event", seq.event++);
      const event: EventEntity = {
        id: eventId,
        companyId: cfg.companyId,
        titulo,
        descricao: `Evento ${categoria.toLowerCase()} com foco em ${tematica.toLowerCase()}, organizado pela ${demandante}.`,
        tematica,
        categoria,
        status: finalStatus,
        responsavelId: responsavel,
        demandante,
        contatoDemandante: `${demandante.toLowerCase().replace(/\s+/g, ".")}@${cfg.companyId === "company_consult" ? "consulteventos.com.br" : "auroralive.com.br"}`,
        tipoLocalizacao: space ? "interno" : "externo",
        local: space?.local ?? "Espaço externo a confirmar",
        spaceId: space?.id,
        formato: rng() < 0.15 ? "hibrido" : rng() < 0.1 ? "online" : "presencial",
        escopo: pick(["Corporativo", "Institucional", "Comercial", "Comunitário"]),
        segmento: pick(["B2B", "B2C", "Interno", "Institucional"]),
        classificacao: pick(["Padrão", "Premium", "Estratégico"]),
        publicoAlvo: pick(["Colaboradores", "Clientes", "Parceiros", "Imprensa", "Público geral"]),
        restrito: rng() < 0.2,
        detalhesPlanejamento: "Planejamento conduzido em conjunto com áreas demandantes, com pontos de controle semanais.",
        jornadaParticipante: "Convite -> Confirmação -> Credenciamento -> Participação -> Pesquisa de satisfação",
        estrategico,
        previstoOrcamento,
        frequencia: multiSessao ? pick(["diario", "semanal"]) : "unico",
        createdBy: responsavel,
        createdAt: isoAt(dayOffset - intBetween(20, 90), 10),
        updatedBy: pick([responsavel, cfg.admin]),
        // A última atualização nunca é anterior à criação nem posterior a
        // hoje: eventos passados foram atualizados por último logo após
        // acontecerem; eventos futuros, pouco antes da data prevista.
        updatedAt: isoAt(isPast ? Math.min(dayOffset + intBetween(0, 3), 0) : dayOffset - intBetween(1, 10), 14),
      };
      events.push(event);

      // Sessões
      const sessionCount = multiSessao ? intBetween(2, 4) : 1;
      for (let s = 0; s < sessionCount; s++) {
        const sInicio = addHours(inicio, s * 26);
        eventSessions.push({
          id: uid("session", seq.session++),
          eventId,
          inicio: sInicio,
          fim: addHours(sInicio, duracaoHoras),
          observacao: sessionCount > 1 ? `Sessão ${s + 1} de ${sessionCount}` : undefined,
        });
      }

      // Histórico de status
      const historySteps = STATUS_CYCLE.slice(0, STATUS_CYCLE.indexOf(finalStatus) + 1);
      historySteps.forEach((st, idx) => {
        statusHistory.push({
          id: uid("history", seq.history++),
          companyId: cfg.companyId,
          eventId,
          statusAnterior: idx === 0 ? null : historySteps[idx - 1],
          statusNovo: st,
          userId: responsavel,
          createdAt: isoAt(dayOffset - (historySteps.length - idx) * 4, 11),
        });
      });

      // Reserva vinculada
      if (space) {
        reservations.push({
          id: uid("reservation", seq.reservation++),
          companyId: cfg.companyId,
          eventId,
          spaceId: space.id,
          inicio,
          fim,
          quantidadePessoas: intBetween(Math.min(10, space.capacidade), space.capacidade),
          motivo: titulo,
          status: isPast ? "concluida" : status === "cancelado" ? "cancelada" : "confirmada",
          solicitanteId: responsavel,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        });
      }

      // Checklist
      const checklistTemplate = [
        { titulo: "Confirmar espaço e horário", categoria: "Logística" },
        { titulo: "Fechar lista de convidados", categoria: "Relacionamento" },
        { titulo: "Contratar fornecedores de apoio", categoria: "Fornecedores" },
        { titulo: "Preparar material de credenciamento", categoria: "Comunicação" },
        { titulo: "Revisar roteiro/cerimonial", categoria: "Conteúdo" },
        { titulo: "Testar equipamentos audiovisuais", categoria: "Técnico" },
      ];
      const itemsForEvent = pickMany(checklistTemplate, intBetween(3, checklistTemplate.length));
      for (const item of itemsForEvent) {
        const concluded = isPast || rng() < 0.4;
        checklistItems.push({
          id: uid("checklist", seq.checklist++),
          companyId: cfg.companyId,
          eventId,
          titulo: item.titulo,
          categoria: item.categoria,
          responsavelId: pick([...cfg.operators, responsavel]),
          prazo: isoAt(dayOffset - intBetween(1, 10), 18),
          status: concluded ? "concluido" : pick(["pendente", "em_andamento", "bloqueado"] as const),
          observacao: undefined,
          concluidoEm: concluded ? isoAt(dayOffset - intBetween(1, 5), 16) : undefined,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        });
      }

      // Orçamento
      if (previstoOrcamento) {
        budgets.push({
          id: uid("budget", seq.budget++),
          companyId: cfg.companyId,
          eventId,
          valorPrevisto: intBetween(5, 250) * 1000,
          observacoes: "Valor previsto conforme estimativa inicial de planejamento.",
          status: pick(["previsto", "em_analise", "aprovado"] as const),
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        });
      }

      // Complexidade
      const factors = {
        publicoAlvo: intBetween(0, 3),
        tipoEspaco: intBetween(0, 3),
        faixaAtivacoes: intBetween(0, 3),
        pacoteServicos: intBetween(0, 3),
        contratacao: intBetween(0, 3),
        legislacao: intBetween(0, 2),
        jornadaParticipante: intBetween(0, 3),
        tipoPublico: intBetween(0, 3),
        autoridades: estrategico ? intBetween(1, 3) : intBetween(0, 1),
        cerimonial: intBetween(0, 3),
        estrategico: estrategico ? 3 : intBetween(0, 1),
      };
      const result = calculateComplexity(factors);
      complexityAssessments.push({
        id: uid("complexity", seq.complexity++),
        companyId: cfg.companyId,
        eventId,
        fatores: factors,
        esforco: result.esforco,
        impacto: result.impacto,
        pontuacao: result.pontuacao,
        nivel: result.nivel,
        createdAt: event.updatedAt,
      });

      // Auditoria
      auditLogs.push({
        id: uid("audit", seq.audit++),
        companyId: cfg.companyId,
        userId: responsavel,
        acao: "criacao",
        entidade: "evento",
        entidadeId: eventId,
        descricao: `Evento "${titulo}" criado.`,
        createdAt: event.createdAt,
      });
      if (finalStatus !== "rascunho") {
        auditLogs.push({
          id: uid("audit", seq.audit++),
          companyId: cfg.companyId,
          userId: pick([responsavel, cfg.admin]),
          acao: "alteracao_status",
          entidade: "evento",
          entidadeId: eventId,
          descricao: `Status do evento "${titulo}" alterado para ${finalStatus}.`,
          createdAt: event.updatedAt,
        });
      }
    }

    // Auditoria de login administrativo
    auditLogs.push({
      id: uid("audit", seq.audit++),
      companyId: cfg.companyId,
      userId: cfg.admin,
      acao: "login",
      entidade: "sessao",
      entidadeId: cfg.admin,
      descricao: "Login administrativo realizado.",
      createdAt: nowIso(-1),
    });
  }

  // Algumas reservas rápidas avulsas (sem evento vinculado ainda).
  for (const cfg of companyConfigs) {
    const companySpaces = spacesByCompany(cfg.companyId).filter((s) => s.status === "ativo");
    for (let i = 0; i < 3; i++) {
      const space = pick(companySpaces);
      const dayOffset = intBetween(1, 30);
      const inicio = isoAt(dayOffset, intBetween(8, 16));
      reservations.push({
        id: uid("reservation", seq.reservation++),
        companyId: cfg.companyId,
        eventId: null,
        spaceId: space.id,
        inicio,
        fim: addHours(inicio, intBetween(1, 4)),
        quantidadePessoas: intBetween(5, Math.min(30, space.capacidade)),
        motivo: pick(["Reunião externa", "Gravação institucional", "Visita de parceiro", "Sessão de fotos"]),
        status: pick(["solicitada", "confirmada"] as const),
        solicitanteId: pick(cfg.operators),
        createdAt: nowIso(-intBetween(1, 10)),
        updatedAt: nowIso(-intBetween(0, 5)),
      });
    }
  }

  return {
    companies,
    users,
    spaces,
    events,
    eventSessions,
    reservations,
    checklistItems,
    budgets,
    complexityAssessments,
    statusHistory,
    auditLogs,
  };
}
