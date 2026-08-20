"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";

/**
 * Botão que exige confirmação em um diálogo próprio do design system
 * antes de executar a ação — nunca usar `window.confirm`/`alert` para
 * regra de negócio (docs/FASE_01_MVP.md, seção 16).
 */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "danger",
  children,
  ...buttonProps
}: {
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  children: ReactNode;
} & Omit<ButtonProps, "onClick">) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} {...buttonProps}>
        {children}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface rounded-[var(--radius-md)] shadow-[var(--shadow-md)] max-w-sm w-full p-5">
            <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
            {description && <p className="text-sm text-fg-muted mt-2">{description}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button
                variant={variant}
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await onConfirm();
                    setOpen(false);
                  })
                }
              >
                {pending ? "Aguarde..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
