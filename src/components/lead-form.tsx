"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "success" | "error";

export function LeadForm({ organizationName }: { organizationName: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        source: "homepage",
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setStatus("error");
      setMessage(body.error ?? "Something went wrong.");
      return;
    }

    event.currentTarget.reset();
    setStatus("success");
    setMessage("Lead saved to your workspace.");
  }

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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="border border-[#d9d7cb] bg-white p-4 text-sm text-[#4a4a43] shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <span>Workspace: {organizationName}</span>
          <div className="flex items-center gap-3">
            <Link className="text-[#0f766e]" href="/settings/team">
              Settings
            </Link>
            <button className="text-[#0f766e]" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={submitLead} className="border border-[#d9d7cb] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#171717]">Add a lead</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
            Add prospects and keep your list organized.
          </p>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium text-[#34342f]">Name</span>
          <input
            name="name"
            autoComplete="name"
            className="w-full border border-[#c9c6b8] px-4 py-3 outline-none focus:border-[#0f766e]"
            placeholder="Matt"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-medium text-[#34342f]">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className="w-full border border-[#c9c6b8] px-4 py-3 outline-none focus:border-[#0f766e]"
            placeholder="matt@1000xleads.com"
          />
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-[#0f766e] px-5 py-3 font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "Saving..." : "Save lead"}
        </button>

        <button
          type="button"
          onClick={startCheckout}
          disabled={status === "loading"}
          className="mt-3 w-full border border-[#0f766e] px-5 py-3 font-semibold text-[#0f766e] transition hover:bg-[#eef7f5] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Start billing checkout
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
    </div>
  );
}
