"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/domain/types";
import { can } from "@/lib/domain/permissions";
import { NAV_ITEMS } from "./nav";
import { ICONS } from "./icons";
import { ConsultServicesMark } from "./ConsultServicesMark";

export function Sidebar({
  role,
  isMobileOpen,
  onCloseMobile,
}: {
  role: Role;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.capability || can(role, item.capability));
  const sections = Array.from(new Set(items.map((item) => item.section)));

  return (
    <>
      {isMobileOpen && (
        <button type="button" aria-label="Fechar menu" className="sidebar-backdrop" onClick={onCloseMobile} />
      )}
      <aside className={`sidebar-shell overflow-y-auto md:min-h-screen md:self-stretch ${isMobileOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand-panel relative">
          <div className="sidebar-brand-logo-frame">
            <ConsultServicesMark className="h-8 w-8" />
          </div>
          <div className="sidebar-rail-only leading-tight">
            <p className="text-sm font-semibold text-[var(--foreground)]">7Eventos</p>
            <p className="text-[11px] text-fg-muted">Consult Services</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="sidebar-close sidebar-rail-only absolute right-3 top-1/2 -translate-y-1/2 md:hidden"
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <div className="sidebar-product sidebar-rail-only">
          <p className="sidebar-product-name">7Eventos</p>
          <p className="sidebar-product-subtitle">Gestão de eventos corporativos</p>
          <p className="sidebar-product-owner">Uma plataforma Consult Services</p>
        </div>

        <nav className="mt-4 flex flex-col gap-5 px-3 pb-5">
          {sections.map((section) => (
            <div key={section}>
              <p className="sidebar-section-label sidebar-rail-only mb-2 px-2">{section}</p>
              <div className="flex flex-col gap-1">
                {items
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = ICONS[item.icon];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        aria-current={active ? "page" : undefined}
                        className={`sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:justify-center lg:justify-start ${
                          active ? "sidebar-nav-link-active shadow-sm" : ""
                        }`}
                      >
                        <Icon />
                        <span className="sidebar-rail-only">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
