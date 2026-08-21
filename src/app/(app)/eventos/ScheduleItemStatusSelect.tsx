"use client";

import { useTransition } from "react";
import { SCHEDULE_ITEM_STATUS_LABELS, type ScheduleItemStatus } from "@/lib/domain/types";
import { updateScheduleItemStatus } from "./schedule-actions";

export function ScheduleItemStatusSelect({
  eventId,
  itemId,
  current,
}: {
  eventId: string;
  itemId: string;
  current: ScheduleItemStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as ScheduleItemStatus;
        startTransition(() => updateScheduleItemStatus(eventId, itemId, status));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(SCHEDULE_ITEM_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
