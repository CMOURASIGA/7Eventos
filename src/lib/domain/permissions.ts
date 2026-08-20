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
  | "view_event"
  | "cancel_delete_event"
  | "manage_reservations"
  | "manage_checklist"
  | "manage_budget"
  | "assess_complexity"
  | "view_reports"
  | "view_audit"
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
    "view_audit",
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
  ],
  operador: ["view_event", "manage_checklist", "manage_reservations"],
  consulta: ["view_event", "view_reports"],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
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
