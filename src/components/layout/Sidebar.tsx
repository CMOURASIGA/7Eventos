"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/domain/types";
import { can } from "@/lib/domain/permissions";
import { NAV_ITEMS } from "./nav";
import { ICONS } from "./icons";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.capability || can(role, item.capability));

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-border-subtle bg-surface">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-border-subtle">
        <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-brand-600 text-white flex items-center justify-center font-bold">
          7
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-[var(--foreground)] text-sm">7Eventos</p>
          <p className="text-[11px] text-fg-muted">Consult Services</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-fg-muted hover:bg-surface-muted hover:text-[var(--foreground)]"
              }`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
