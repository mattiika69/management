"use client";

import { useState } from "react";
import { INSPIRATION_CATEGORIES } from "@/lib/hyperoptimal/data";
import type { CompanyContextRow, FunnelRow } from "@/lib/hyperoptimal/server";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export function InspirationWorkspace({
  contexts,
  funnels,
}: {
  contexts: CompanyContextRow[];
  funnels: FunnelRow[];
}) {
  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contextId, setContextId] = useState("");
  const [funnelId, setFunnelId] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [saving, setSaving] = useState(false);

  async function saveInspiration() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        category,
        contextId: contextId || null,
        funnelId: funnelId || null,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      setMessageTone("error");
      setMessage(result.error ?? "Inspiration was not saved.");
      return;
    }
    setTitle("");
    setBody("");
    setMessageTone("info");
    setMessage("Inspiration saved to Notes.");
  }

  return (
    <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
            Capture inspiration
          </h2>
          <p className="mt-0.5 text-[13px] text-[color:var(--color-ink-500)]">
            Save examples, hooks, and ad copy that spark ideas — they sync to Notes automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_220px_220px]">
        <Field label="Category">
          <Select
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value)}
          >
            {INSPIRATION_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Email inspiration, ad angle, VSL hook…"
          />
        </Field>
        <Field label="Context">
          <Select
            value={contextId}
            onChange={(event) => setContextId(event.currentTarget.value)}
          >
            <option value="">None</option>
            {contexts.map((context) => (
              <option key={context.id} value={context.id}>
                {context.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Funnel">
          <Select
            value={funnelId}
            onChange={(event) => setFunnelId(event.currentTarget.value)}
          >
            <option value="">None</option>
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>
                {funnel.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Inspiration" className="mt-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          rows={14}
          placeholder="Paste the example, hook, email, page copy, ad, or idea here."
        />
      </Field>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={saveInspiration}
          disabled={saving || !body.trim()}
          loading={saving}
        >
          {saving ? "Saving" : "Save to Notes"}
        </Button>
        {message ? (
          <div
            className={`rounded-lg border px-3 py-1.5 text-[13px] ${
              messageTone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
            role="status"
          >
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
