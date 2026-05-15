"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CreditCheckoutButton({
  pack = "starter",
}: {
  pack?: "starter" | "growth";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/billing/credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    setLoading(false);
    if (!response.ok || !body.url) {
      setError(body.error ?? "Checkout is not available.");
      return;
    }
    window.location.href = body.url;
  }

  const isGrowth = pack === "growth";

  return (
    <div className="space-y-1">
      <Button
        onClick={checkout}
        loading={loading}
        variant={isGrowth ? "primary" : "secondary"}
        leftIcon={
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        }
      >
        {loading
          ? "Opening"
          : isGrowth
            ? "Buy 500 credits"
            : "Buy 100 credits"}
      </Button>
      {error ? (
        <p className="text-[11px] text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
