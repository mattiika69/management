"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Status = "idle" | "loading" | "success" | "error";

export function LeadForm({ organizationName }: { organizationName: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        source: "homepage",
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setStatus("error");
      setMessage(body.error ?? "Something went wrong.");
      return;
    }

    event.currentTarget.reset();
    setStatus("success");
    setMessage("Lead saved to your workspace.");
  }

  async function startCheckout() {
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/billing/checkout", { method: "POST" });
    const body = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !body.url) {
      setStatus("error");
      setMessage(body.error ?? "Billing is not available yet.");
      return;
    }

    window.location.href = body.url;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-[13px] shadow-[var(--shadow-card)]">
        <span className="text-[color:var(--color-ink-500)]">
          Workspace: <span className="font-medium text-[color:var(--color-ink-900)]">{organizationName}</span>
        </span>
        <div className="flex items-center gap-4">
          <Link className="font-medium text-[color:var(--color-brand-600)] hover:underline" href="/settings/team">
            Settings
          </Link>
          <button
            className="font-medium text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
            type="button"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          eyebrow="Leads"
          title="Add a lead"
          description="Capture prospects and keep your list organized."
        />
        <CardBody>
          <form onSubmit={submitLead} className="space-y-4">
            <Field label="Name">
              <Input name="name" autoComplete="name" placeholder="Matt" />
            </Field>
            <Field label="Email" required>
              <Input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
              />
            </Field>

            <Button type="submit" loading={status === "loading"} fullWidth>
              {status === "loading" ? "Saving" : "Save lead"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={startCheckout}
              disabled={status === "loading"}
              fullWidth
            >
              Start billing checkout
            </Button>

            {message ? (
              <div
                className={`rounded-lg border px-3.5 py-2.5 text-[13px] ${
                  status === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
                role="status"
              >
                {message}
              </div>
            ) : null}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
