import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/** Card - contêiner base padronizado. */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-surface border border-border-subtle rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border-subtle">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
        {description && <p className="text-sm text-fg-muted mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Badge - indicador de status, com paleta semântica coerente com o design system. */
const BADGE_TONES = {
  neutral: "bg-surface-muted text-fg-muted border-border-subtle",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-success-50 text-success-700 border-success-500/30",
  warning: "bg-warning-50 text-warning-700 border-warning-500/30",
  danger: "bg-danger-50 text-danger-700 border-danger-500/30",
  info: "bg-info-50 text-info-700 border-info-500/30",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const fieldBase =
  "w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-surface-muted disabled:text-fg-muted";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} min-h-24 ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block text-sm font-medium text-[var(--foreground)] mb-1 ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-fg-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger-700 mt-1">{error}</p>}
    </div>
  );
}

const ICON_TONES = {
  neutral: "bg-surface-muted text-fg-muted",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-700",
} as const;

/** KPICard - indicador do dashboard. */
export function KPICard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof BADGE_TONES;
  href?: string;
  icon?: ReactNode;
}) {
  const content = (
    <Card className="p-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-[var(--foreground)]">{value}</p>
        </div>
        {icon && (
          <span className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${ICON_TONES[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      {hint && (
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${BADGE_TONES[tone]}`}>
          {hint}
        </span>
      )}
    </Card>
  );
  if (href) {
    return (
      <a href={href} className="block h-full transition-transform hover:-translate-y-0.5">
        {content}
      </a>
    );
  }
  return content;
}

/** Estados padronizados de tela assíncrona. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="mb-3 text-fg-muted">{icon}</div>}
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {description && <p className="text-sm text-fg-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <p className="font-medium text-danger-700">Não foi possível carregar os dados</p>
      <p className="text-sm text-fg-muted mt-1 max-w-sm">{message}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-muted rounded-[var(--radius-sm)] ${className}`} />;
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const tones = {
    success: "bg-success-50 text-success-700 border-success-500/30",
    warning: "bg-warning-50 text-warning-700 border-warning-500/30",
    danger: "bg-danger-50 text-danger-700 border-danger-500/30",
    info: "bg-info-50 text-info-700 border-info-500/30",
  };
  return (
    <div className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm ${tones[tone]}`} role="status">
      {children}
    </div>
  );
}
