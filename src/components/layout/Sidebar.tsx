"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Company, Role } from "@/lib/domain/types";
import { can } from "@/lib/domain/permissions";
import { NAV_ITEMS } from "./nav";
import { ICONS } from "./icons";
import { BrandLogo } from "./BrandLogo";

export function Sidebar({
  role,
  company,
  isDemo,
  isMobileOpen,
  onCloseMobile,
}: {
  role: Role;
  company: Company | null;
  isDemo: boolean;
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
      <aside
        className={`sidebar-shell overflow-y-auto md:min-h-screen md:self-stretch ${isMobileOpen ? "is-open" : ""}`}
        style={{ width: 256 }}
      >
        <div className="relative border-b border-white/15 px-4 pb-6 pt-4">
          <div className="flex h-[144px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white px-1 py-1 shadow-sm ring-1 ring-black/5">
            <BrandLogo company={company} />
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="sidebar-close absolute right-3 top-3 md:hidden"
            aria-label="Fechar menu"
          >
            ×
          </button>

          <div className="mt-6 px-2">
            <div className="flex items-center gap-2">
              <p className="sidebar-product-name">7Eventos</p>
              {isDemo && (
                <span className="rounded-md border border-amber-300/50 bg-amber-300/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-200">
                  Demo
                </span>
              )}
            </div>
            <p className="sidebar-product-subtitle">Gestão de eventos corporativos</p>
          </div>
        </div>

        <nav className="flex flex-col gap-5 px-3 py-4">
          {sections.map((section) => (
            <div key={section}>
              <p className="sidebar-section-label mb-2 px-2">{section}</p>
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
                        className={`sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "sidebar-nav-link-active shadow-sm" : ""}`}
                        onClick={onCloseMobile}
                      >
                        <Icon />
                        <span>{item.label}</span>
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
