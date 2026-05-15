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
    <form onSubmit={inviteMember} className="border border-[#d9d7cb] bg-white p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-[#171717]">Invite member</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
          Send a secure invitation link to add someone to this workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <label>
          <span className="mb-2 block text-sm font-medium text-[#34342f]">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className="w-full border border-[#c9c6b8] px-4 py-3 outline-none focus:border-[#0f766e]"
            placeholder="teammate@example.com"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-[#34342f]">Role</span>
          <select
            name="role"
            defaultValue="member"
            className="w-full border border-[#c9c6b8] bg-white px-4 py-3 outline-none focus:border-[#0f766e]"
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
        className="mt-5 bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
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
