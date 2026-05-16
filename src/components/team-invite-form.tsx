"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export function TeamInviteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        role: formData.get("role"),
      }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Invitation failed.");
      return;
    }

    form.reset();
    setStatus("success");
    setMessage("Invitation sent.");
    router.refresh();
  }

  return (
    <form onSubmit={inviteMember} className="settings-card-pad">
      <div className="mb-5">
        <h2 className="text-[22px] font-bold text-[#101828]">Invite member</h2>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[#667085]">
          Send a secure invitation link to add someone to this workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <label>
          <span className="mb-2 block text-[13px] font-semibold text-[#344054]">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className="settings-field w-full"
            placeholder="teammate@example.com"
          />
        </label>

        <label>
          <span className="mb-2 block text-[13px] font-semibold text-[#344054]">Role</span>
          <select
            name="role"
            defaultValue="member"
            className="settings-field w-full"
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="settings-button-dark mt-5"
      >
        {status === "loading" ? "Sending..." : "Send invite"}
      </button>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-red-700" : "text-[#0f766e]"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
