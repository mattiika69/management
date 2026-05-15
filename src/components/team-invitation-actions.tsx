"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "error";

export function TeamInvitationActions({ invitationId }: { invitationId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function cancelInvite() {
    setStatus("loading");
    setMessage("");

    const response = await fetch(`/api/settings/team/invitations/${invitationId}`, {
      method: "DELETE",
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Could not cancel invitation.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={cancelInvite}
        disabled={status === "loading"}
        className="text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Cancelling..." : "Cancel"}
      </button>
      {message ? (
        <p className="mt-2 text-sm text-red-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
