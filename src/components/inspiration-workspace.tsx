"use client";

import { useState } from "react";
import { INSPIRATION_CATEGORIES } from "@/lib/hyperoptimal/data";
import type { CompanyContextRow, FunnelRow } from "@/lib/hyperoptimal/server";

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
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Inspiration was not saved.");
      return;
    }
    setTitle("");
    setBody("");
    setMessage("Inspiration saved to Notes.");
  }

  return (
    <section className="rounded-lg border border-[#d8dee9] bg-white p-5 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_220px_220px]">
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
            Category
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value)}
            className="h-10 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
          >
            {INSPIRATION_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
            Title
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Idea, note, client context..."
            className="h-10 w-full rounded-md border border-[#cfd8e6] px-3 text-sm outline-none focus:border-[#2f80ed]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
            Context
          </span>
          <select
            value={contextId}
            onChange={(event) => setContextId(event.currentTarget.value)}
            className="h-10 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
          >
            <option value="">None</option>
            {contexts.map((context) => (
              <option key={context.id} value={context.id}>{context.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
            Workspace Area
          </span>
          <select
            value={funnelId}
            onChange={(event) => setFunnelId(event.currentTarget.value)}
            className="h-10 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
          >
            <option value="">None</option>
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
          Inspiration
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          rows={14}
          placeholder="Paste the example, hook, email, page copy, ad, or idea here."
          className="w-full resize-y rounded-md border border-[#cfd8e6] px-3 py-3 text-sm leading-6 outline-none focus:border-[#2f80ed]"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveInspiration}
          disabled={saving || !body.trim()}
          className="rounded-md bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save to Notes"}
        </button>
        {message ? <p className="text-sm text-[#111827]" role="status">{message}</p> : null}
      </div>
    </section>
  );
}
