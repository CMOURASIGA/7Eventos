"use client";

import { useTransition } from "react";
import { EVENT_RISK_STATUS_LABELS, type EventRiskStatus } from "@/lib/domain/types";
import { updateRiskStatus } from "./risk-actions";

export function RiskStatusSelect({
  eventId,
  riskId,
  current,
}: {
  eventId: string;
  riskId: string;
  current: EventRiskStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as EventRiskStatus;
        startTransition(() => updateRiskStatus(eventId, riskId, status));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(EVENT_RISK_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
