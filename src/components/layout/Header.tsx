import type { Company, User } from "@/lib/domain/types";
import { ROLE_LABELS } from "@/lib/domain/types";
import { logout } from "@/lib/auth/actions";
import { getDataMode } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { DemoResetButton } from "./DemoResetButton";

export function Header({ user, company }: { user: User; company: Company | null }) {
  const isDemo = getDataMode() === "mock";

  return (
    <header className="h-16 shrink-0 border-b border-border-subtle bg-surface flex items-center justify-between px-4 md:px-6 gap-4">
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

      <div className="flex items-center gap-3">
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
