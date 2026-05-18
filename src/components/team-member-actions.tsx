"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const roles = ["owner", "admin", "member", "viewer"];

export function TeamMemberActions({
  userId,
  currentUserId,
  role,
}: {
  userId: string;
  currentUserId: string;
  role: string;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isSelf = userId === currentUserId;

  async function updateRole(nextRole: string) {
    setSelectedRole(nextRole);
    setMessage("");
    const response = await fetch(`/api/team/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setSelectedRole(role);
      setMessage(body.error ?? "Role could not be updated.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function removeMember() {
    setMessage("");
    const response = await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Member could not be removed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (isSelf) {
    return <span className="text-[12px] font-medium text-[#667085]">Locked</span>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedRole}
          onChange={(event) => void updateRole(event.target.value)}
          disabled={isPending}
          className="settings-field h-9 min-w-[112px] normal-case"
          aria-label="Change team member role"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void removeMember()}
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-[7px] border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {message ? <p className="text-[11px] font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}
