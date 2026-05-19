"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
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
  if (notice === "login-required") {
    return "Sign in to continue.";
  }
  return "";
}

function authErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect. Try again or reset your password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (lower.includes("email rate limit")) {
    return "Too many attempts. Wait a moment, then try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "We could not reach the login service. Check your connection and try again.";
  }
  return message || "Sign in failed. Please try again.";
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
  const [showResetHelp, setShowResetHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = safeNextPath(next);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("info");
    setShowResetHelp(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    let result: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } catch {
      setLoading(false);
      setMessageType("error");
      setMessage("We could not reach the login service. Check your connection and try again.");
      setShowResetHelp(false);
      return;
    }

    const { data, error } = result;

    if (error) {
      setLoading(false);
      setMessageType("error");
      setMessage(authErrorMessage(error.message));
      setShowResetHelp(true);
      return;
    }

    if (!data.session) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        setMessageType("error");
        setMessage("Sign in did not finish. Try again or reset your password.");
        setShowResetHelp(true);
        return;
      }
    }

    window.location.assign(nextPath);
  }

  return (
    <form
      onSubmit={signInWithPassword}
      className="w-full max-w-[448px] rounded-[14px] bg-white px-8 py-9 shadow-[0_18px_42px_rgba(31,54,94,0.14)] sm:px-8"
    >
      <div className="mb-9 text-center">
        <h1 className="text-[26px] font-bold leading-tight text-[#111827]">
          HyperOptimal
        </h1>
        <p className="mt-2 text-[16px] leading-6 text-[#727c91]">
          Sign in to your account
        </p>
      </div>

      <label className="mb-5 block">
        <span className="mb-2 block text-[15px] font-medium text-[#334155]">Email</span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={initialEmail}
          readOnly={Boolean(initialEmail)}
          className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-[#eaf2ff] px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
          placeholder="team@hyperoptimal.com"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-2 flex items-center justify-between text-[15px] font-medium text-[#334155]">
          Password
          <Link className="text-[15px] font-medium text-[#2563ff]" href="/reset-password">
            Forgot password?
          </Link>
        </span>
        <span className="relative block">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-[#eaf2ff] px-4 pr-11 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
            placeholder="Password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]"
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
        className="mt-1 h-12 w-full rounded-[7px] bg-[#1f5bff] px-5 text-[17px] font-medium text-white transition hover:bg-[#164ce5] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {message ? (
        <div
          className={`mt-4 rounded-[7px] border px-4 py-3 text-center text-sm font-medium ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-[#2563ff]"
          }`}
          role="status"
          aria-live="polite"
        >
          <p>{message}</p>
          {showResetHelp ? (
            <Link className="mt-2 inline-block text-[#2563ff]" href="/reset-password">
              Reset password
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
