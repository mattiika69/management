"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const supabase = createClient();
    const origin = window.location.origin;

    let errorMessage = "";
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
      });
      errorMessage = error?.message ?? "";
    } catch {
      errorMessage = "We could not reach the password reset service.";
    }

    setLoading(false);
    setMessage(
      errorMessage
        ? `${errorMessage} Try again in a moment.`
        : "If that email has an account, a reset link is on the way.",
    );
  }

  return (
    <form
      onSubmit={resetPassword}
      className="w-full max-w-[448px] rounded-[14px] bg-white px-8 py-9 shadow-[0_18px_42px_rgba(31,54,94,0.14)] sm:px-8"
    >
      <div className="mb-9 text-center">
        <h1 className="text-[26px] font-bold leading-tight text-[#111827]">
          HyperOptimal
        </h1>
        <p className="mt-2 text-[16px] leading-6 text-[#727c91]">
          Reset your password
        </p>
      </div>

      <p className="mb-7 text-[15px] leading-6 text-[#475569]">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      <label className="mb-5 block">
        <span className="mb-2 block text-[15px] font-medium text-[#334155]">Email</span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-white px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
          placeholder="you@example.com"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-[7px] bg-[#1f5bff] px-5 text-[17px] font-medium text-white transition hover:bg-[#164ce5] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      {message ? (
        <p className="mt-4 text-center text-sm text-[#2563ff]" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[15px] text-[#727c91]">
        Remember your password?{" "}
        <Link className="font-medium text-[#2563ff]" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
