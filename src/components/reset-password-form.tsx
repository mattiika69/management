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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    });

    setLoading(false);
    setMessage(error ? error.message : "Check your email for a reset link.");
  }

  return (
    <form
      onSubmit={resetPassword}
      className="border border-[#d9d7cb] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#171717]">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
          We will email a secure link to update your password.
        </p>
      </div>

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
        disabled={loading}
        className="w-full bg-[#0f766e] px-5 py-3 font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      {message ? (
        <p className="mt-4 text-sm text-[#0f766e]" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-[#5d5d55]">
        Remembered it?{" "}
        <Link className="text-[#0f766e]" href="/login">
          Log in
        </Link>
      </p>
    </form>
  );
}
