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

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    const origin = window.location.origin;
    const nextPath = safeNextPath(next);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setLoading(false);
    setMessage(
      error ? error.message : "Check your email to confirm your account.",
    );
  }

  return (
    <form onSubmit={signUp} className="border border-[#d9d7cb] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#171717]">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
          Create your workspace and continue.
        </p>
      </div>

      <label className="mb-4 block">
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
          minLength={8}
          name="password"
          type="password"
          autoComplete="new-password"
          className="w-full border border-[#c9c6b8] px-4 py-3 outline-none focus:border-[#0f766e]"
          placeholder="At least 8 characters"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0f766e] px-5 py-3 font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creating..." : "Create account"}
      </button>

      {message ? (
        <p className="mt-4 text-sm text-[#0f766e]" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-[#5d5d55]">
        Already have an account?{" "}
        <Link
          className="text-[#0f766e]"
          href={`/login?next=${encodeURIComponent(safeNextPath(next))}`}
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
