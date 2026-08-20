"use client";

import { useTransition } from "react";
import { CHECKLIST_STATUS_LABELS, type ChecklistStatus } from "@/lib/domain/types";
import { setChecklistItemStatus } from "./checklist-actions";

export function ChecklistStatusSelect({
  eventId,
  itemId,
  current,
}: {
  eventId: string;
  itemId: string;
  current: ChecklistStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as ChecklistStatus;
        startTransition(() => setChecklistItemStatus(eventId, itemId, status));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(CHECKLIST_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
