"use client";

import { useState, type ReactNode } from "react";
import type { Company, Role, User } from "@/lib/domain/types";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

/**
 * Combina Sidebar + Header mantendo o estado da gaveta de navegação
 * mobile compartilhado entre os dois (o botão de abrir fica no Header,
 * o de fechar e o backdrop ficam na Sidebar).
 */
export function AppChrome({
  role,
  user,
  company,
  isDemo,
  children,
}: {
  role: Role;
  user: User;
  company: Company | null;
  isDemo: boolean;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen w-full md:flex md:items-stretch">
      <Sidebar role={role} isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          company={company}
          isDemo={isDemo}
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
        />
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
