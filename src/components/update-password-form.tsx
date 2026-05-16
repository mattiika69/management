"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated.");
    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={updatePassword}
      className="border border-[#d9d7cb] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#171717]">Update password</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
          Choose a new password for your HyperOptimal Management account.
        </p>
      </div>

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-[#34342f]">
          New password
        </span>
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
        {loading ? "Updating..." : "Update password"}
      </button>

      {message ? (
        <p className="mt-4 text-sm text-[#0f766e]" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
