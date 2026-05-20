"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("://") ? next : "/get-started";
}

function successBody(email: string) {
  return `We've sent a confirmation link to ${email}. Please click the link to continue setup.`;
}

export function SignupForm({
  initialEmail = "",
  next = "/get-started",
  billingClaimToken = "",
}: {
  initialEmail?: string;
  next?: string;
  billingClaimToken?: string;
}) {
  const [message, setMessage] = useState("");
  const [successEmail, setSuccessEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nextPath = safeNextPath(next);
  const isInviteSignup = nextPath.startsWith("/invite/");

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          firstName,
          lastName,
          email,
          password,
          redirect: nextPath,
          billingClaimToken,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
      };

      setLoading(false);
      if (!response.ok) {
        setMessage(payload.error || "Account creation failed. Please try again.");
        return;
      }

      setSuccessEmail(payload.email || email);
    } catch {
      setLoading(false);
      setMessage("Authentication provider is temporarily unavailable. Please retry in a minute.");
    }
  }

  if (successEmail) {
    return (
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{successBody(successEmail)}</p>
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
    <form onSubmit={signUp} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-950">HyperOptimal</h1>
        <p className="mt-2 text-sm text-slate-500">Create your account</p>
      </div>

      {isInviteSignup ? null : (
        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Organization Name</span>
          <input
            required
            name="organizationName"
            type="text"
            autoComplete="organization"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="Your company name"
          />
        </label>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">First Name</span>
          <input
            required
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="First name"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Last Name</span>
          <input
            required
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="Last name"
          />
        </label>
      </div>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={initialEmail}
          readOnly={Boolean(initialEmail)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="team@hyperoptimal.com"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-11 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
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
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          Use 8+ characters with an uppercase letter, lowercase letter, number, and symbol.
        </span>
      </label>

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-11 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="Confirm password"
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            onClick={() => setShowConfirmPassword((visible) => !visible)}
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
        {loading ? "Creating account..." : "Create account"}
      </button>

      {message ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" href={`/login?redirect=${encodeURIComponent(nextPath)}`}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
