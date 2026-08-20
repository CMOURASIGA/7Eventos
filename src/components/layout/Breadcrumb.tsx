import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Trilha de navegação + botão de voltar, usados nas páginas internas
 * (detalhe, edição, criação) para que o usuário sempre saiba onde está
 * e tenha um caminho claro de retorno, sem depender do menu lateral ou
 * do botão "voltar" do navegador.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="flex items-center gap-1.5 text-sm text-fg-muted flex-wrap">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span aria-hidden="true">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-brand-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[var(--foreground)] font-medium" : ""} aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-brand-700"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      {label}
    </Link>
  );
}

/** Cabeçalho padrão de página interna: breadcrumb + botão voltar + título + ações. */
export function PageHeader({
  breadcrumb,
  backHref,
  backLabel,
  title,
  description,
  actions,
}: {
  breadcrumb: BreadcrumbItem[];
  backHref: string;
  backLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Breadcrumb items={breadcrumb} />
        <BackLink href={backHref} label={backLabel} />
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">{title}</h1>
          {description && <p className="text-sm text-fg-muted mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
