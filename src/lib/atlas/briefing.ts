import "server-only";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { collectEventContext } from "./context";
import { assembleBriefing } from "./briefingEngine";
import type { AtlasBriefing } from "./types";

/**
 * Atlas (Fase 3) - preparação operacional / briefing (docs/FASE_03_ATLAS.md
 * seção 9). Reaproveita collectEventContext() para reter os riscos já
 * detectados (seção 6) e o financeiro já filtrado por permissão — evita
 * duplicar o motor de riscos e a regra de autorização financeira aqui —
 * e busca só o que falta: entidades brutas com nome (equipe, fornecedores,
 * agenda, cronograma, checklist), que o contexto achatado do modelo não
 * carrega (princípio 9 "minimizar contexto enviado ao modelo" — o
 * briefing não é enviado ao modelo, então não precisa ser achatado).
 *
 * Não usa nenhum provedor de IA: por isso funciona mesmo sem
 * OPENAI_API_KEY configurada, como o motor de riscos e a análise
 * financeira.
 */
export async function generateEventBriefing(session: AuthSession, eventId: string, repository: Repository): Promise<AtlasBriefing | null> {
  const [event, context] = await Promise.all([repository.events.get(session, eventId), collectEventContext(session, eventId, repository)]);
  if (!event || !context) return null;

  const [sessions, space, teamMembers, eventSuppliers, suppliers, users, scheduleItems, checklist] = await Promise.all([
    repository.events.getSessions(session, eventId),
    event.spaceId ? repository.spaces.get(session, event.spaceId) : Promise.resolve(null),
    repository.team.listByEvent(session, eventId),
    repository.eventSuppliers.listByEvent(session, eventId),
    repository.suppliers.list(session),
    repository.users.list(session),
    repository.schedule.listByEvent(session, eventId),
    repository.checklist.listByEvent(session, eventId),
  ]);

  return assembleBriefing({
    event,
    riscosDetectados: context.riscosDetectados,
    financeiro: context.financeiro,
    participantes: { inscritos: context.participantes.inscritos, confirmados: context.participantes.confirmados },
    sessions,
    space,
    teamMembers,
    eventSuppliers,
    suppliers,
    users,
    scheduleItems,
    checklist,
  });
}
