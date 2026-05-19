"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const roles = ["owner", "admin", "member", "viewer"];

export function TeamMemberActions({
  userId,
  currentUserId,
  role,
  displayName,
  email,
  phone,
  joinedAt,
}: {
  userId: string;
  currentUserId: string;
  role: string;
  displayName: string;
  email: string;
  phone: string;
  joinedAt: string;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [nameValue, setNameValue] = useState(displayName);
  const [emailValue, setEmailValue] = useState(email);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isSelf = userId === currentUserId;
  const disabled = isSaving || isPending;

  async function saveMember() {
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/team/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: nameValue,
          email: emailValue,
          phone: phoneValue,
          role: selectedRole,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "Member could not be saved.");
        return;
      }
      setMessage("Saved.");
      startTransition(() => router.refresh());
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMember() {
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "Member could not be removed.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setIsSaving(false);
    }
  }

  if (isSelf) {
    return (
      <>
        <div className="min-w-0">
          <p className="truncate font-bold text-[#171717]">{displayName}</p>
          <p className="mt-1 text-[11px] font-medium text-[#667085]">You</p>
        </div>
        <p className="truncate text-[#667085]">{email}</p>
        <p className="truncate text-[#667085]">{phone || "-"}</p>
        <p className="capitalize text-[#667085]">
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </p>
        <p className="text-[#667085]">{joinedAt}</p>
        <span className="text-[12px] font-medium text-[#667085]">Locked</span>
      </>
    );
  }

  return (
    <>
      <label className="min-w-0">
        <span className="sr-only">Name</span>
        <input
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
          disabled={disabled}
          className="settings-field h-9 w-full min-w-0 normal-case"
          placeholder="Name"
        />
      </label>
      <label className="min-w-0">
        <span className="sr-only">Email</span>
        <input
          value={emailValue}
          onChange={(event) => setEmailValue(event.target.value)}
          disabled={disabled}
          type="email"
          className="settings-field h-9 w-full min-w-0 normal-case"
          placeholder="email@example.com"
        />
      </label>
      <label className="min-w-0">
        <span className="sr-only">Phone</span>
        <input
          value={phoneValue}
          onChange={(event) => setPhoneValue(event.target.value)}
          disabled={disabled}
          type="tel"
          className="settings-field h-9 w-full min-w-0 normal-case"
          placeholder="Phone"
        />
      </label>
      <label>
        <span className="sr-only">Role</span>
        <select
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          disabled={disabled}
          className="settings-field h-9 w-full min-w-[112px] normal-case"
          aria-label="Change team member role"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[#667085]">{joinedAt}</p>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveMember()}
            disabled={disabled}
            className="inline-flex h-9 items-center justify-center rounded-[7px] bg-[#101828] px-3 text-[11px] font-semibold text-white transition hover:bg-[#1d2939] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => void removeMember()}
            disabled={disabled}
            className="inline-flex h-9 items-center justify-center rounded-[7px] border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        {message ? (
          <p
            className={`text-[11px] font-semibold ${
              message === "Saved." ? "text-emerald-700" : "text-red-600"
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </>
  );
}
