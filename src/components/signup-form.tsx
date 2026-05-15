"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/get-started";
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

type RuleId = "length" | "upper" | "lower" | "number" | "symbol";

const rules: Array<{ id: RuleId; label: string; test: (value: string) => boolean }> = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "Uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "Lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "Number", test: (v) => /\d/.test(v) },
  { id: "symbol", label: "Symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function SignupForm({ next = "/get-started" }: { next?: string }) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const passwordValue = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const supabase = createClient();
    const origin = window.location.origin;
    const nextPath = safeNextPath(next);

    if (passwordValue !== confirmPassword) {
      setLoading(false);
      setMessageTone("error");
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: passwordValue,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        data: {
          organization_name: organizationName,
          first_name: firstName,
          last_name: lastName,
          name: [firstName, lastName].filter(Boolean).join(" "),
        },
      },
    });

    setLoading(false);
    setMessageTone(error ? "error" : "info");
    setMessage(
      error ? error.message : "Check your email to confirm your account.",
    );
  }

  return (
    <form
      onSubmit={signUp}
      className="w-full max-w-[480px] rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Create your account
        </h1>
        <p className="mt-1.5 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          Start your workspace in under a minute.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Organization name" required>
          <Input
            required
            name="organizationName"
            type="text"
            autoComplete="organization"
            placeholder="Your company"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" required>
            <Input
              required
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="First"
            />
          </Field>
          <Field label="Last name" required>
            <Input
              required
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last"
            />
          </Field>
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

        <Field label="Password" required>
          <div className="relative">
            <Input
              required
              minLength={8}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
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

          <ul className="mt-3 grid gap-1.5">
            {rules.map((rule) => {
              const ok = password.length > 0 && rule.test(password);
              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-2 text-[12px] transition-colors ${
                    ok
                      ? "text-emerald-700"
                      : "text-[color:var(--color-ink-400)]"
                  }`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                      ok
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-300)]"
                    }`}
                  >
                    {ok ? (
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-current" />
                    )}
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </Field>

        <Field label="Confirm password" required>
          <div className="relative">
            <Input
              required
              minLength={8}
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-ink-400)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-700)]"
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
        </Field>
      </div>

      <Button type="submit" loading={loading} fullWidth size="lg" className="mt-6">
        {loading ? "Creating account" : "Create account"}
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
        Already have an account?{" "}
        <Link
          className="font-medium text-[color:var(--color-ink-900)] hover:underline"
          href={`/login?next=${encodeURIComponent(safeNextPath(next))}`}
        >
          Log in
        </Link>
      </p>

      <p className="mt-4 text-center text-[11px] leading-5 text-[color:var(--color-ink-400)]">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-[color:var(--color-ink-700)]">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-[color:var(--color-ink-700)]">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
