"use client";

import Link from "next/link";
import { useState } from "react";
import { CompanyContextForm } from "@/components/company-context-form";
import type { CompanyContextRow } from "@/lib/hyperoptimal/server";

export function ContextWorkspace({
  contexts,
  activeContext,
}: {
  contexts: CompanyContextRow[];
  activeContext: CompanyContextRow;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createContext() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `AI Context Doc ${contexts.length + 1}` }),
    });
    const body = (await response.json()) as { context?: CompanyContextRow; error?: string };
    setBusy(false);
    if (!response.ok || !body.context) {
      setMessage(body.error ?? "Context was not created.");
      return;
    }
    window.location.href = `/settings/ai-context-docs?context=${body.context.id}`;
  }

  async function archiveContext() {
    if (contexts.length <= 1) {
      setMessage("Create another context before deleting this one.");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/contexts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeContext.id }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error ?? "Context was not deleted.");
      return;
    }
    const next = contexts.find((context) => context.id !== activeContext.id);
    window.location.href = next ? `/settings/ai-context-docs?context=${next.id}` : "/settings/ai-context-docs";
  }

  return (
    <div className="settings-page grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="settings-card p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#111827]">AI Context Docs</h2>
          <button
            type="button"
            onClick={createContext}
            disabled={busy}
            className="border border-[#c9c6b8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#34342f] disabled:opacity-60"
          >
            Add
          </button>
        </div>
        <div className="mt-3 space-y-1">
          {contexts.map((context) => (
            <Link
              key={context.id}
              href={`/settings/ai-context-docs?context=${context.id}`}
              className={`block border px-3 py-2 text-sm transition ${
                context.id === activeContext.id
                  ? "border-blue-400/70 bg-blue-50 text-blue-900"
                  : "border-transparent text-[#647084] hover:border-[#d8dee9] hover:bg-[#f8fafc]"
              }`}
            >
              <span className="block truncate font-semibold">{context.title}</span>
              <span className="mt-1 block text-xs capitalize text-[#8490a3]">{context.status}</span>
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={archiveContext}
          disabled={busy}
          className="mt-4 w-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
        >
          Delete Selected
        </button>
        {message ? <p className="mt-3 text-xs text-red-700">{message}</p> : null}
      </aside>

      <CompanyContextForm
        contextId={activeContext.id}
        title={activeContext.title}
        status={activeContext.status}
        initialData={activeContext.data}
        updatedAt={activeContext.updated_at}
      />
    </div>
  );
}
