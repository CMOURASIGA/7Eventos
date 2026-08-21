import type { Capability } from "@/lib/domain/permissions";
import type { Role } from "@/lib/domain/types";

export interface NavItem {
  label: string;
  href: string;
  icon: "dashboard" | "calendar" | "events" | "spaces" | "reservations" | "reports" | "audit" | "users" | "suppliers";
  section: "Principal" | "Gestão" | "Análise" | "Sistema";
  /** Quando definido, item só aparece se `can(perfil, capability)` for verdadeiro. */
  capability?: Capability;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", section: "Principal" },
  { label: "Agenda", href: "/agenda", icon: "calendar", section: "Principal" },
  { label: "Eventos", href: "/eventos", icon: "events", section: "Gestão", capability: "view_event" },
  { label: "Espaços", href: "/espacos", icon: "spaces", section: "Gestão", capability: "view_event" },
  { label: "Reservas", href: "/reservas", icon: "reservations", section: "Gestão", capability: "view_event" },
  { label: "Fornecedores", href: "/fornecedores", icon: "suppliers", section: "Gestão", capability: "view_event" },
  { label: "Relatórios", href: "/relatorios", icon: "reports", section: "Análise", capability: "view_reports" },
  { label: "Auditoria", href: "/auditoria", icon: "audit", section: "Análise", capability: "view_audit" },
  { label: "Usuários", href: "/administracao/usuarios", icon: "users", section: "Sistema", capability: "manage_company_users" },
];

export function navItemsForRole(role: Role, canFn: (role: Role, capability: Capability) => boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.capability || canFn(role, item.capability));
}
