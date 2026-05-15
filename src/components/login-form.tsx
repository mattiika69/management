"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm({ next = "/" }: { next?: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
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

  async function signInWithLink() {
    if (!formRef.current) {
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData(formRef.current);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const supabase = createClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setLoading(false);
    setMessage(error ? error.message : "Check your email for a sign-in link.");
  }

  return (
    <form
      ref={formRef}
      onSubmit={signInWithPassword}
      className="border border-[#d9d7cb] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#171717]">Log in</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
          Log in to continue to your workspace.
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

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-[#34342f]">Password</span>
        <input
          required
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full border border-[#c9c6b8] px-4 py-3 outline-none focus:border-[#0f766e]"
          placeholder="Your password"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0f766e] px-5 py-3 font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Signing in..." : "Log in"}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={signInWithLink}
        className="mt-3 w-full border border-[#0f766e] px-5 py-3 font-semibold text-[#0f766e] transition hover:bg-[#eef7f5] disabled:cursor-not-allowed disabled:opacity-70"
      >
        Email sign-in link
      </button>

      {message ? (
        <p className="mt-4 text-sm text-[#0f766e]" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#5d5d55]">
        <Link
          className="text-[#0f766e]"
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
        >
          Create account
        </Link>
        <Link className="text-[#0f766e]" href="/reset-password">
          Reset password
        </Link>
        <Link className="text-[#0f766e]" href="/privacy">
          Privacy
        </Link>
        <Link className="text-[#0f766e]" href="/terms">
          Terms
        </Link>
      </div>
    </form>
  );
}
