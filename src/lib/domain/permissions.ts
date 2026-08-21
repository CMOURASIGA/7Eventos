import type { Role } from "./types";

/**
 * RN11 - Permissões.
 *
 * A interface não é o único mecanismo de proteção: toda função aqui
 * definida deve ser chamada também pela camada de dados/serviço
 * (src/lib/data) antes de ler ou gravar informação sensível, não
 * apenas pelos componentes de UI que escondem menus/botões.
 *
 * Matriz inicial de capacidades, conforme docs (main:
 * 01-architecture/AUTHORIZATION.md) e docs/7EVENTOS_SPEC.md seção 4.
 */

export type Capability =
  | "manage_company_users"
  | "manage_company_settings"
  | "manage_spaces"
  | "create_edit_event"
  | "create_event"
  | "view_event"
  | "cancel_delete_event"
  | "manage_reservations"
  | "manage_checklist"
  | "manage_budget"
  | "assess_complexity"
  | "view_reports"
  | "view_financials"
  | "view_audit"
  | "manage_suppliers"
  | "manage_team"
  | "manage_schedule"
  | "manage_documents"
  | "manage_platform"; // superadmin apenas

const MATRIX: Record<Role, Capability[]> = {
  superadmin: ["manage_platform"],
  admin_empresa: [
    "manage_company_users",
    "manage_company_settings",
    "manage_spaces",
    "create_edit_event",
    "view_event",
    "cancel_delete_event",
    "manage_reservations",
    "manage_checklist",
    "manage_budget",
    "assess_complexity",
    "view_reports",
    "view_financials",
    "view_audit",
    "manage_suppliers",
    "manage_team",
    "manage_schedule",
    "manage_documents",
  ],
  gestor_eventos: [
    "manage_spaces",
    "create_edit_event",
    "view_event",
    "cancel_delete_event",
    "manage_reservations",
    "manage_checklist",
    "manage_budget",
    "assess_complexity",
    "view_reports",
    "view_financials",
    "manage_suppliers",
    "manage_team",
    "manage_schedule",
    "manage_documents",
  ],
  // Pode criar eventos (sempre nascem em rascunho) e organizar reservas/
  // checklist/cronograma/documentos do dia a dia, mas aprovação,
  // cancelamento, edição de campos já publicados e valores financeiros
  // seguem exclusivos de Gestor/Admin. Acessa relatórios operacionais
  // (view_reports), mas não view_financials.
  operador: [
    "view_event",
    "create_event",
    "manage_checklist",
    "manage_reservations",
    "manage_schedule",
    "manage_documents",
    "view_reports",
  ],
  consulta: ["view_event", "view_reports"],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

/** Pode iniciar o cadastro de um evento (assistente em etapas), seja com edição completa ou só criação. */
export function canCreateEvent(role: Role): boolean {
  return can(role, "create_edit_event") || can(role, "create_event");
}

export function assertCanCreateEvent(role: Role): void {
  if (!canCreateEvent(role)) {
    throw new PermissionError("create_event");
  }
}

/** Lança erro se o perfil não possuir a capacidade exigida. Uso na camada de dados. */
export function assertCan(role: Role, capability: Capability): void {
  if (!can(role, capability)) {
    throw new PermissionError(capability);
  }
}

export class PermissionError extends Error {
  constructor(public readonly capability: Capability) {
    super(`Perfil não autorizado para: ${capability}`);
    this.name = "PermissionError";
  }
}

/** Empresas que o perfil enxerga operacionalmente. Superadmin fica fora do contexto normal. */
export function isOperationalRole(role: Role): boolean {
  return role !== "superadmin";
}
