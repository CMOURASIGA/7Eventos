"use client";

import { useTransition } from "react";
import { REGISTRATION_STATUS_LABELS, type RegistrationStatus } from "@/lib/domain/types";
import { updateRegistrationStatus } from "./registration-actions";

export function RegistrationStatusSelect({
  eventId,
  registrationId,
  current,
}: {
  eventId: string;
  registrationId: string;
  current: RegistrationStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as RegistrationStatus;
        startTransition(() => updateRegistrationStatus(eventId, registrationId, status));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
