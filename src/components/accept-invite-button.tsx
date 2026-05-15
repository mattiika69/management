"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-2">
      <Button onClick={acceptInvite} loading={status === "loading"} fullWidth size="lg">
        {status === "loading" ? "Accepting" : "Accept invitation"}
      </Button>
      {message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
