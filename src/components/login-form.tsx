"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm({ next = "/" }: { next?: string }) {
  const [message, setMessage] = useState("");
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
      setMessage(error.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
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
        <p className="mt-4 text-center text-sm text-[#2563ff]" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[15px] text-[#727c91]">
        Don&apos;t have an account?{" "}
        <Link
          className="font-medium text-[#2563ff]"
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
