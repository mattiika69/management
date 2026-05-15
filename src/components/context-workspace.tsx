"use client";

import Link from "next/link";
import { useState } from "react";
import { CompanyContextForm } from "@/components/company-context-form";
import type { CompanyContextRow } from "@/lib/hyperoptimal/server";
import { Button } from "@/components/ui/button";

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
    const body = (await response.json()) as {
      context?: CompanyContextRow;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !body.context) {
      setMessage(body.error ?? "Context was not created.");
      return;
    }
    window.location.href = `/ai-company-document?context=${body.context.id}`;
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
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error ?? "Context was not deleted.");
      return;
    }
    const next = contexts.find((context) => context.id !== activeContext.id);
    window.location.href = next
      ? `/ai-company-document?context=${next.id}`
      : "/ai-company-document";
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
              Context docs
            </h2>
            <p className="text-[11px] text-[color:var(--color-ink-400)]">
              {contexts.length} {contexts.length === 1 ? "doc" : "docs"}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={createContext}
            disabled={busy}
            leftIcon={
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            New
          </Button>
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {contexts.map((context) => {
            const isActive = context.id === activeContext.id;
            return (
              <Link
                key={context.id}
                href={`/ai-company-document?context=${context.id}`}
                className={`group relative block rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? "bg-[color:var(--color-brand-50)] ring-1 ring-[color:var(--color-brand-100)]"
                    : "hover:bg-[color:var(--color-surface-muted)]"
                }`}
              >
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[color:var(--color-brand-500)]" />
                ) : null}
                <span
                  className={`block truncate text-[13px] font-medium ${
                    isActive
                      ? "text-[color:var(--color-brand-900)]"
                      : "text-[color:var(--color-ink-900)]"
                  }`}
                >
                  {context.title}
                </span>
                <span
                  className={`mt-0.5 block text-[11px] capitalize ${
                    isActive
                      ? "text-[color:var(--color-brand-600)]"
                      : "text-[color:var(--color-ink-400)]"
                  }`}
                >
                  {context.status}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 border-t border-[color:var(--color-border)] pt-4">
          <Button
            size="sm"
            variant="ghost"
            fullWidth
            onClick={archiveContext}
            disabled={busy}
            className="text-[color:var(--color-danger)] hover:bg-red-50"
          >
            Delete selected
          </Button>
          {message ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
              {message}
            </p>
          ) : null}
        </div>
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
