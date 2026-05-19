"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("://") ? next : "/";
}

function noticeMessage(notice: string | undefined) {
  if (notice === "invite-link-invalid") {
    return "This invite link is missing the access token. Ask the sender for a fresh invite.";
  }
  if (notice === "invite-auth-failed") {
    return "The invite sign-in link could not be verified. Sign in with the invited email, then open the invite again.";
  }
  if (notice === "auth-callback-failed") {
    return "That sign-in link could not be verified. Try signing in with your email and password.";
  }
  if (notice === "organization-setup-failed") {
    return "Your account was verified, but workspace setup did not finish. Sign in and retry.";
  }
  if (notice === "login-required") {
    return "Sign in to continue.";
  }
  return "";
}

export function LoginForm({
  initialEmail = "",
  next = "/",
  notice,
}: {
  initialEmail?: string;
  next?: string;
  notice?: string;
}) {
  const [message, setMessage] = useState(noticeMessage(notice));
  const [messageType, setMessageType] = useState<"info" | "error">(
    noticeMessage(notice) ? "error" : "info",
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = safeNextPath(next);
  const resetHref = initialEmail
    ? `/forgot-password?email=${encodeURIComponent(initialEmail)}`
    : "/forgot-password";

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("info");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, redirect: nextPath }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setMessageType("error");
        setMessage(payload.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      window.location.assign(safeNextPath(payload.redirectTo || nextPath));
    } catch {
      setMessageType("error");
      setMessage("Authentication provider is temporarily unavailable. Please retry in a minute.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={signInWithPassword} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-950">HyperOptimal</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
      </div>

      {message ? (
        <div
          className={`mb-8 rounded-lg border px-4 py-3 text-sm font-medium ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={initialEmail}
          readOnly={Boolean(initialEmail)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:bg-blue-50 focus:ring-2 focus:ring-blue-600/20 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/20"
          placeholder="team@hyperoptimal.com"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
          Password
          <Link className="font-medium text-blue-600 hover:text-blue-700" href={resetHref}>
            Forgot password?
          </Link>
        </span>
        <span className="relative block">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-11 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:bg-blue-50 focus:ring-2 focus:ring-blue-600/20"
            placeholder="Password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M2.75 12s3.4-6.25 9.25-6.25S21.25 12 21.25 12s-3.4 6.25-9.25 6.25S2.75 12 2.75 12Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>


      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" href={`/signup?redirect=${encodeURIComponent(nextPath)}`}>
          Sign up
        </Link>
      </p>
    </form>
  );
}
