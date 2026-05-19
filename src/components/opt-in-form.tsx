"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OptInForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    try {
      const response = await fetch("/api/leads/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, source: "opt-in" }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Your request could not be saved.");
      }

      router.push("/opt-in-thank-you");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your request could not be saved.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submitLead} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">Get the workspace checklist</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Send the checklist to your inbox and start tightening team execution today.
      </p>
      <div className="mt-5 grid gap-3">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="Your name"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="you@company.com"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send me the checklist"}
      </button>
      {message ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="status">
          {message}
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">
        We&apos;ll send the checklist and one follow-up with setup guidance. No extra offers here.
      </p>
    </form>
  );
}
