"use client";

import { useTransition } from "react";
import { BUDGET_ITEM_STATUS_LABELS, type BudgetItemStatus } from "@/lib/domain/types";
import { updateBudgetItemStatus } from "./budget-item-actions";

export function BudgetItemStatusSelect({
  eventId,
  itemId,
  current,
}: {
  eventId: string;
  itemId: string;
  current: BudgetItemStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as BudgetItemStatus;
        startTransition(() => updateBudgetItemStatus(eventId, itemId, status));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(BUDGET_ITEM_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
