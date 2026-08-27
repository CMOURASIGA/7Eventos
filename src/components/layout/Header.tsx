"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Company, User } from "@/lib/domain/types";
import { ROLE_LABELS } from "@/lib/domain/types";
import { logout } from "@/lib/auth/actions";
import { can } from "@/lib/domain/permissions";
import { DemoResetButton } from "./DemoResetButton";
import { NAV_ITEMS } from "./nav";

export function Header({ user, company, isDemo, mobileNavOpen, onToggleMobileNav }: { user: User; company: Company | null; isDemo: boolean; mobileNavOpen: boolean; onToggleMobileNav: () => void; }) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentItem = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const pageTitle = currentItem?.label ?? "Gestão de eventos";
  const canResetDemo = isDemo && can(user.perfil, "manage_company_settings");

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-white/95 px-4 py-2 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onToggleMobileNav} aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileNavOpen} className="mobile-nav-toggle md:hidden">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Gestão de eventos</p><h1 className="truncate text-base font-semibold text-[var(--foreground)]">{pageTitle}</h1></div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-success-500/20 bg-success-50 px-3 py-1.5 text-[12px] font-semibold text-success-700 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-success-500" />Sistema online</span>
        <div ref={menuRef} className="relative">
          <button type="button" onClick={() => setUserMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-surface-muted sm:px-2" aria-expanded={userMenuOpen} aria-haspopup="menu">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: user.avatarColor }}>{initials(user.nome)}</span>
            <span className="hidden min-w-0 text-left md:block"><span className="block max-w-40 truncate text-sm font-semibold text-[var(--foreground)]">{user.nome}</span><span className="block text-[10px] uppercase tracking-wide text-fg-muted">{ROLE_LABELS[user.perfil]}</span></span>
            <svg className="hidden h-4 w-4 text-fg-muted md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {userMenuOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"><div className="border-b border-border-subtle px-4 py-4"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{user.nome}</p><p className="mt-1 text-[11px] uppercase tracking-wide text-fg-muted">{ROLE_LABELS[user.perfil]}</p>{company && <p className="mt-1 truncate text-xs text-fg-muted">{company.configuracoes.nomeExibido ?? company.nomeFantasia}</p>}</div><div className="p-2">{canResetDemo && <DemoResetButton />}<form action={logout}><button type="submit" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-danger-700 hover:bg-danger-50">Sair</button></form></div></div>}
        </div>
      </div>
    </header>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
