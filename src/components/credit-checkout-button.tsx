"use client";

import { useState } from "react";

export function CreditCheckoutButton({ pack = "starter" }: { pack?: "starter" | "growth" }) {
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
    const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    setLoading(false);
    if (!response.ok || !body.url) {
      setError(body.error ?? "Checkout is not available.");
      return;
    }
    window.location.href = body.url;
  }

  return (
    <div>
      <button
        type="button"
        onClick={checkout}
        disabled={loading}
        className="settings-button-dark h-9 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening..." : pack === "growth" ? "Buy 500 Credits" : "Buy 100 Credits"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
