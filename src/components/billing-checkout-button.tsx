"use client";

import { useState } from "react";

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
      setMessage(body.error ?? "Checkout could not be opened.");
      return;
    }

    window.location.href = body.url;
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={status === "loading"}
        className="w-full bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "loading" ? "Opening checkout..." : "Continue to checkout"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-red-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
