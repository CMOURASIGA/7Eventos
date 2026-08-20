import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

/**
 * Navegação por abas baseada em query string (`?tab=...`), sem
 * JavaScript no cliente — cada aba é um link normal, consistente com o
 * resto da aplicação (ex: alternância Mês/Lista da Agenda).
 */
export function Tabs({
  items,
  active,
  basePath,
  extraParams,
}: {
  items: TabItem[];
  active: string;
  basePath: string;
  /** Outros parâmetros da URL a preservar ao trocar de aba (ex: filtros). */
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="border-b border-border-subtle overflow-x-auto">
      <nav className="flex gap-1 min-w-max" aria-label="Seções do evento">
        {items.map((item) => {
          const isActive = item.key === active;
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(extraParams ?? {})) {
            if (v) params.set(k, v);
          }
          params.set("tab", item.key);
          return (
            <Link
              key={item.key}
              href={`${basePath}?${params.toString()}`}
              aria-current={isActive ? "page" : undefined}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-fg-muted hover:text-[var(--foreground)] hover:border-border"
              }`}
            >
              {item.label}
              {item.count != null && (
                <span className="ml-1.5 text-xs text-fg-muted">({item.count})</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
