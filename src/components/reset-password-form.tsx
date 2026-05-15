"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
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
    setMessageTone(error ? "error" : "info");
    setMessage(error ? error.message : "Check your email for a reset link.");
  }

  return (
    <form
      onSubmit={resetPassword}
      className="w-full max-w-[448px] rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Reset your password
        </h1>
        <p className="mt-1.5 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      <Field label="Email" required>
        <Input
          required
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
        />
      </Field>

      <Button type="submit" loading={loading} fullWidth size="lg" className="mt-6">
        {loading ? "Sending link" : "Send reset link"}
      </Button>

      {message ? (
        <div
          role="status"
          className={`mt-4 rounded-lg border px-3.5 py-2.5 text-[13px] ${
            messageTone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"
          }`}
        >
          {message}
        </div>
      ) : null}

      <p className="mt-6 text-center text-[13px] text-[color:var(--color-ink-500)]">
        Remember your password?{" "}
        <Link
          className="font-medium text-[color:var(--color-ink-900)] hover:underline"
          href="/login"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
