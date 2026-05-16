"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/get-started";
}

export function SignupForm({ next = "/get-started" }: { next?: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const supabase = createClient();
    const origin = window.location.origin;
    const nextPath = safeNextPath(next);

    if (password !== confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
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
    setMessage(
      error ? error.message : "Check your email to confirm your account.",
    );
  }

  return (
    <form
      onSubmit={signUp}
      className="w-full max-w-[448px] rounded-[14px] bg-white px-8 py-9 shadow-[0_18px_42px_rgba(31,54,94,0.14)] sm:px-8"
    >
      <div className="mb-9 text-center">
        <h1 className="text-[26px] font-bold leading-tight text-[#111827]">
          HyperOptimal
        </h1>
        <p className="mt-2 text-[16px] leading-6 text-[#727c91]">
          Create your account
        </p>
      </div>

      <label className="mb-4 block">
        <span className="mb-2 block text-[15px] font-medium text-[#334155]">
          Organization Name
        </span>
        <input
          required
          name="organizationName"
          type="text"
          autoComplete="organization"
          className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-white px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
          placeholder="Your company name"
        />
      </label>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[15px] font-medium text-[#334155]">
            First Name
          </span>
          <input
            required
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-white px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
            placeholder="First name"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[15px] font-medium text-[#334155]">
            Last Name
          </span>
          <input
            required
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-white px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
            placeholder="Last name"
          />
        </label>
      </div>

      <label className="mb-4 block">
        <span className="mb-2 block text-[15px] font-medium text-[#334155]">Email</span>
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-[#eaf2ff] px-4 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
          placeholder="team@hyperoptimal.com"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-2 block text-[15px] font-medium text-[#334155]">Password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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
        <span className="mt-2 block text-[12px] leading-5 text-[#7b879b]">
          Use 8+ characters with an uppercase letter, lowercase letter, number, and symbol.
        </span>
        <span className="mt-3 block space-y-2 text-[12px] text-[#9aa6b7]">
          <span className="block">· 8+ length</span>
          <span className="block">· Uppercase letter</span>
          <span className="block">· Lowercase letter</span>
          <span className="block">· Number</span>
          <span className="block">· Symbol</span>
        </span>
      </label>

      <label className="mb-5 block">
        <span className="mb-2 block text-[15px] font-medium text-[#334155]">
          Confirm Password
        </span>
        <span className="relative block">
          <input
            required
            minLength={8}
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="h-12 w-full rounded-[7px] border border-[#cbd5e1] bg-white px-4 pr-11 text-[16px] text-[#111827] outline-none transition focus:border-[#2563ff] focus:ring-2 focus:ring-[#2563ff]/15"
            placeholder="Confirm password"
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            onClick={() => setShowConfirmPassword((visible) => !visible)}
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
        className="h-12 w-full rounded-[7px] bg-[#1f5bff] px-5 text-[17px] font-medium text-white transition hover:bg-[#164ce5] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {message ? (
        <p className="mt-4 text-center text-sm text-[#2563ff]" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[15px] text-[#727c91]">
        Already have an account?{" "}
        <Link
          className="font-medium text-[#2563ff]"
          href={`/login?next=${encodeURIComponent(safeNextPath(next))}`}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
