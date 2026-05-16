"use client";

import { useMemo, useState } from "react";
import { FunnelTracker } from "@/components/funnel-tracker";
import {
  BOOK_A_CALL_LAUNCH_ASSETS,
  BUILDER_OPTIONS,
  type BuilderKey,
} from "@/lib/hyperoptimal/data";
import type {
  CompanyContextRow,
  CreditAccountRow,
  FunnelRow,
  FunnelStepRow,
} from "@/lib/hyperoptimal/server";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function BookACallLaunchWorkspace({
  funnels,
  activeFunnel,
  steps,
  contexts,
  creditAccount,
}: {
  funnels: FunnelRow[];
  activeFunnel: FunnelRow;
  steps: FunnelStepRow[];
  contexts: CompanyContextRow[];
  creditAccount: CreditAccountRow | null;
}) {
  const [name, setName] = useState(activeFunnel.name);
  const [contextId, setContextId] = useState(activeFunnel.context_id ?? "");
  const [builderKey, setBuilderKey] = useState<BuilderKey>(activeFunnel.builder_key);
  const [builderProjectUrl, setBuilderProjectUrl] = useState(activeFunnel.builder_project_url);
  const [selectedAssets, setSelectedAssets] = useState<Record<string, boolean>>(
    () => Object.fromEntries(BOOK_A_CALL_LAUNCH_ASSETS.map((asset) => [asset.key, true])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [lastLaunchLinks, setLastLaunchLinks] = useState<
    Array<{ assetKey: string; noteId?: string; status: string }>
  >([]);
  const selectedAssetKeys = useMemo(
    () =>
      BOOK_A_CALL_LAUNCH_ASSETS.filter((asset) => selectedAssets[asset.key]).map(
        (asset) => asset.key,
      ),
    [selectedAssets],
  );
  const estimatedCredits = BOOK_A_CALL_LAUNCH_ASSETS.filter(
    (asset) => selectedAssets[asset.key],
  ).reduce((sum, asset) => sum + asset.creditCost, 0);
  const selectedContext = contexts.find((context) => context.id === contextId);

  async function createFunnel(duplicateFromId?: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: duplicateFromId
          ? undefined
          : `Book a Call Funnel ${funnels.length + 1}`,
        contextId: contextId || null,
        builderKey,
        builderProjectUrl,
        duplicateFromId,
      }),
    });
    const body = (await response.json()) as { funnel?: FunnelRow; error?: string };
    setBusy(false);
    if (!response.ok || !body.funnel) {
      setMessageTone("error");
      setMessage(body.error ?? "Funnel was not created.");
      return;
    }
    window.location.href = `/funnels/book-a-call?funnel=${body.funnel.id}`;
  }

  async function persistFunnelSettings() {
    const response = await fetch("/api/funnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeFunnel.id,
        name,
        contextId: contextId || null,
        builderKey,
        builderProjectUrl,
        status: contextId ? "ready" : "draft",
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "Funnel settings did not save.");
    }
  }

  async function saveFunnel() {
    setBusy(true);
    setMessage("");
    try {
      await persistFunnelSettings();
      setMessageTone("info");
      setMessage("Funnel settings saved.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Funnel settings did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFunnel() {
    if (funnels.length <= 1) {
      setMessageTone("error");
      setMessage("Create another funnel before deleting this one.");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/funnels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeFunnel.id }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessageTone("error");
      setMessage(body.error ?? "Funnel was not deleted.");
      return;
    }
    const next = funnels.find((funnel) => funnel.id !== activeFunnel.id);
    window.location.href = next
      ? `/funnels/book-a-call?funnel=${next.id}`
      : "/funnels/book-a-call";
  }

  async function launchFunnel() {
    setBusy(true);
    setMessage("");
    setLastLaunchLinks([]);
    try {
      await persistFunnelSettings();
      const response = await fetch(`/api/funnels/${activeFunnel.id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetKeys: selectedAssetKeys,
          builderKey,
          builderProjectUrl,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        spentCredits?: number;
        results?: Array<{ assetKey: string; noteId?: string; status: string }>;
      };
      if (!response.ok) {
        setMessageTone("error");
        setMessage(body.error ?? "Launch failed.");
        return;
      }
      setLastLaunchLinks(body.results ?? []);
      setMessageTone("info");
      setMessage(`Launch completed. Credits spent: ${body.spentCredits ?? 0}.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Launch failed.");
    } finally {
      setBusy(false);
    }
  }

  const launchDisabled =
    busy ||
    !contextId ||
    selectedContext?.status !== "confirmed" ||
    selectedAssetKeys.length === 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
              Funnel settings
            </h2>
            <Badge
              tone={
                activeFunnel.status === "ready"
                  ? "success"
                  : activeFunnel.status === "draft"
                    ? "neutral"
                    : "brand"
              }
            >
              {activeFunnel.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => createFunnel()} disabled={busy}>
              New funnel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => createFunnel(activeFunnel.id)}
              disabled={busy}
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={deleteFunnel}
              disabled={busy}
              className="text-[color:var(--color-danger)] hover:border-red-200 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Funnel">
              <Select
                value={activeFunnel.id}
                onChange={(event) => {
                  window.location.href = `/funnels/book-a-call?funnel=${event.currentTarget.value}`;
                }}
              >
                {funnels.map((funnel) => (
                  <option key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <Input
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </Field>
            <Field label="Builder">
              <Select
                value={builderKey}
                onChange={(event) => setBuilderKey(event.currentTarget.value as BuilderKey)}
              >
                {BUILDER_OPTIONS.map((builder) => (
                  <option key={builder.key} value={builder.key}>
                    {builder.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Builder link">
              <Input
                value={builderProjectUrl}
                onChange={(event) => setBuilderProjectUrl(event.currentTarget.value)}
                placeholder="https://…"
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Field label="Linked AI Context Doc">
              <Select
                value={contextId}
                onChange={(event) => setContextId(event.currentTarget.value)}
              >
                <option value="">Select confirmed context</option>
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.title} {context.status === "confirmed" ? "" : "(draft)"}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-ink-500)]">
                <svg className="h-3.5 w-3.5 text-[color:var(--color-brand-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
                <span className="font-semibold tabular-nums text-[color:var(--color-ink-900)]">
                  {creditAccount?.balance_credits ?? 0}
                </span>
                credits
              </span>
              <Button variant="primary" onClick={saveFunnel} loading={busy}>
                Save settings
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                  Launch assets
                </h3>
                <Badge tone="brand">{estimatedCredits} credits</Badge>
              </div>
              <p className="mt-1 text-[12px] text-[color:var(--color-ink-500)]">
                {selectedContext?.status !== "confirmed"
                  ? "Confirm the linked context before launch."
                  : "Selected assets will be generated and saved as notes."}
              </p>
            </div>
            <Button onClick={launchFunnel} disabled={launchDisabled} loading={busy}>
              {busy ? "Working" : "Launch funnel"}
            </Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {BOOK_A_CALL_LAUNCH_ASSETS.map((asset) => {
              const checked = selectedAssets[asset.key] ?? false;
              return (
                <label
                  key={asset.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${
                    checked
                      ? "border-[color:var(--color-brand-200)] bg-[color:var(--color-brand-50)]/40"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-border-strong)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedAssets((current) => ({
                        ...current,
                        [asset.key]: event.currentTarget.checked,
                      }));
                    }}
                    className="h-4 w-4 rounded border-[color:var(--color-border-strong)] text-[color:var(--color-brand-600)] focus:ring-[color:var(--color-ring)]"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--color-ink-900)]">
                    {asset.title}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-[color:var(--color-ink-400)]">
                    {asset.creditCost}c
                  </span>
                </label>
              );
            })}
          </div>

          {message ? (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-[13px] ${
                messageTone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
              role="status"
            >
              {message}
            </div>
          ) : null}
          {lastLaunchLinks.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {lastLaunchLinks
                .filter((result) => result.noteId)
                .map((result) => (
                  <a
                    key={`${result.assetKey}-${result.noteId}`}
                    href={`/notes?note=${result.noteId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] px-3 py-1 text-[12px] font-semibold text-[color:var(--color-brand-700)] transition-colors hover:bg-[color:var(--color-brand-100)]"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {result.assetKey}
                  </a>
                ))}
            </div>
          ) : null}
        </div>
      </section>

      <FunnelTracker funnelType="book-a-call" funnel={activeFunnel} steps={steps} />
    </div>
  );
}
