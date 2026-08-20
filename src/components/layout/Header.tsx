"use client";

import type { Company, User } from "@/lib/domain/types";
import { ROLE_LABELS } from "@/lib/domain/types";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { ICONS } from "./icons";
import { DemoResetButton } from "./DemoResetButton";

export function Header({
  user,
  company,
  isDemo,
  mobileNavOpen,
  onToggleMobileNav,
}: {
  user: User;
  company: Company | null;
  isDemo: boolean;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}) {
  return (
    <header className="h-16 shrink-0 border-b border-border-subtle bg-white/95 backdrop-blur flex items-center justify-between px-4 md:px-6 gap-4">
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileNavOpen}
          className="mobile-nav-toggle md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)] truncate">
            {company?.nomeFantasia ?? "Consult Services"}
          </p>
          {isDemo && (
            <p className="text-[11px] text-warning-700 font-medium">
              Ambiente de demonstração — dados fictícios, reiniciáveis
            </p>
          )}
        </div>
      </div>

      <form action="/buscar" className="hidden md:flex flex-1 max-w-sm items-center gap-1.5">
        <label className="relative w-full" title="Busque por título de evento, nome de espaço, motivo de reserva ou usuário e pressione Enter">
          <span className="sr-only">Buscar eventos, espaços, reservas ou usuários</span>
          <ICONS.search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="search"
            name="q"
            placeholder="Buscar eventos, espaços, reservas, usuários..."
            className="w-full rounded-[var(--radius-sm)] border border-border bg-white pl-8 pr-3 py-1.5 text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </label>
        <Button type="submit" variant="secondary" size="sm" aria-label="Buscar">
          <ICONS.search />
        </Button>
      </form>

      <div className="flex items-center gap-3 shrink-0">
        {isDemo && <DemoResetButton />}

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border-subtle">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: user.avatarColor }}
          >
            {initials(user.nome)}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-[var(--foreground)]">{user.nome}</p>
            <p className="text-[11px] text-fg-muted">{ROLE_LABELS[user.perfil]}</p>
          </div>
        </div>

        <form action={logout}>
          <Button type="submit" variant="secondary" size="sm">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
