"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "error";

export function BillingCheckoutButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/billing/checkout", { method: "POST" });
    const body = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !body.url) {
      setStatus("error");
      setMessage(body.error ?? "Billing is not available yet.");
      return;
    }

    window.location.href = body.url;
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={startCheckout}
        loading={status === "loading"}
        rightIcon={
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        }
      >
        {status === "loading" ? "Opening checkout" : "Continue to checkout"}
      </Button>
      {message ? (
        <p className="text-[12px] text-red-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
