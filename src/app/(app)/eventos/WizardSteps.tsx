import Link from "next/link";

export const WIZARD_STEPS = [
  { step: 1, label: "Informações básicas" },
  { step: 2, label: "Data e localização" },
  { step: 3, label: "Responsáveis e público" },
  { step: 4, label: "Planejamento" },
  { step: 5, label: "Revisão e criação" },
] as const;

/** Indicador de progresso do assistente de novo evento. Etapas já visitadas ficam clicáveis. */
export function WizardSteps({ eventId, current }: { eventId?: string; current: number }) {
  return (
    <ol className="flex items-center gap-2 flex-wrap text-sm">
      {WIZARD_STEPS.map(({ step, label }) => {
        const state = step === current ? "current" : step < current ? "done" : "upcoming";
        const content = (
          <span className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                state === "current"
                  ? "bg-brand-600 text-white"
                  : state === "done"
                    ? "bg-success-500 text-white"
                    : "bg-surface-muted text-fg-muted"
              }`}
            >
              {state === "done" ? "✓" : step}
            </span>
            <span className={state === "current" ? "font-medium text-[var(--foreground)]" : "text-fg-muted"}>{label}</span>
          </span>
        );
        return (
          <li key={step} className="flex items-center gap-2">
            {eventId && state !== "upcoming" ? (
              <Link href={`/eventos/${eventId}/novo?step=${step}`}>{content}</Link>
            ) : (
              content
            )}
            {step < WIZARD_STEPS.length && <span className="text-border" aria-hidden="true">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
