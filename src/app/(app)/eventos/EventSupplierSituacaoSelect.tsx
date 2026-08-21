"use client";

import { useTransition } from "react";
import { EVENT_SUPPLIER_SITUACAO_LABELS, type EventSupplierSituacao } from "@/lib/domain/types";
import { updateEventSupplierSituacao } from "./supplier-actions";

export function EventSupplierSituacaoSelect({
  eventId,
  linkId,
  current,
}: {
  eventId: string;
  linkId: string;
  current: EventSupplierSituacao;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const situacao = e.target.value as EventSupplierSituacao;
        startTransition(() => updateEventSupplierSituacao(eventId, linkId, situacao));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(EVENT_SUPPLIER_SITUACAO_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
