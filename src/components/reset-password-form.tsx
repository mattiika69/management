"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function ResetPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [message, setMessage] = useState("");
  const [successEmail, setSuccessEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cooldownActive) return;

    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Password reset email could not be sent.");
      }

      setSuccessEmail(email);
      setCooldownActive(true);
      window.setTimeout(() => setCooldownActive(false), 20_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Password reset email could not be sent.";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  }

  if (successEmail) {
    return (
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path d="M4.75 6.75h14.5v10.5H4.75V6.75Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="m5.5 7.5 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          If an account exists for {successEmail}, we&apos;ve sent a password reset link. Click the link to continue.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          Back to Sign In
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={resetPassword} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-950">HyperOptimal</h1>
        <p className="mt-2 text-sm text-slate-500">Reset your password</p>
      </div>

      <p className="mb-7 text-sm leading-6 text-slate-600">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={initialEmail}
          readOnly={Boolean(initialEmail)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="you@example.com"
        />
      </label>

      <button
        type="submit"
        disabled={loading || cooldownActive}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      {message ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
