"use client";

import { useTransition } from "react";
import { ROLE_LABELS, type Role } from "@/lib/domain/types";
import { setUserRole } from "./actions";

const ASSIGNABLE_ROLES: Role[] = ["admin_empresa", "gestor_eventos", "operador", "consulta"];

export function UserRoleSelect({ userId, current }: { userId: string; current: Role }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => startTransition(() => setUserRole(userId, e.target.value as Role))}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {ASSIGNABLE_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}
