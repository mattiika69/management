"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M2.75 12s3.4-6.25 9.25-6.25S21.25 12 21.25 12s-3.4 6.25-9.25 6.25S2.75 12 2.75 12Z" />
          <circle cx="12" cy="12" r="2.75" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c5.85 0 9.25 6 9.25 6a17.5 17.5 0 0 1-3.4 4.05" />
          <path d="M6.1 7.6A17.5 17.5 0 0 0 2.75 12S6.15 18.25 12 18.25c1.36 0 2.6-.27 3.7-.7" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  );
}

export function LoginForm({ next = "/" }: { next?: string }) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const nextPath = safeNextPath(next);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form
      onSubmit={signInWithPassword}
      className="w-full max-w-[448px] rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          Log in to your workspace to continue.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Email" required>
          <Input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
          />
        </Field>

        <Field
          label={
            <span className="flex items-center justify-between">
              <span>Password</span>
              <Link
                href="/reset-password"
                className="text-[12px] font-medium text-[color:var(--color-brand-600)] hover:underline"
              >
                Forgot password?
              </Link>
            </span>
          }
          required
        >
          <div className="relative">
            <Input
              required
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-ink-400)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-700)]"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </Field>
      </div>

      <Button type="submit" loading={loading} fullWidth size="lg" className="mt-6">
        {loading ? "Signing in" : "Log in"}
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
        Don&apos;t have an account?{" "}
        <Link
          className="font-medium text-[color:var(--color-ink-900)] hover:underline"
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
