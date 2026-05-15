"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
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
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    setMessageTone("info");
    setMessage("Password updated.");
    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={updatePassword}
      className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          Pick something strong and unique to your workspace.
        </p>
      </div>

      <Field label="New password" hint="At least 8 characters." required>
        <Input
          required
          minLength={8}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter a new password"
        />
      </Field>

      <Button type="submit" loading={loading} fullWidth size="lg" className="mt-6">
        {loading ? "Updating password" : "Update password"}
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
    </form>
  );
}
