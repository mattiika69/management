"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "error";

export function AcceptInviteButton({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function acceptInvite() {
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/team/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Could not accept invitation.");
      return;
    }

    router.push("/settings/team?invite=accepted");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={acceptInvite}
        disabled={status === "loading"}
        className="bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Accepting..." : "Accept invitation"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-red-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
