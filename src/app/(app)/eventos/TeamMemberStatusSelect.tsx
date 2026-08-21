"use client";

import { useTransition } from "react";
import { TEAM_MEMBER_STATUS_LABELS, type TeamMemberStatus } from "@/lib/domain/types";
import { updateTeamMemberStatus } from "./team-actions";

export function TeamMemberStatusSelect({
  eventId,
  memberId,
  current,
}: {
  eventId: string;
  memberId: string;
  current: TeamMemberStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as TeamMemberStatus;
        startTransition(() => updateTeamMemberStatus(eventId, memberId, status));
      }}
      className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs disabled:opacity-60"
    >
      {Object.entries(TEAM_MEMBER_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
