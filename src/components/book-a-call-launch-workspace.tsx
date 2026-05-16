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
  const [lastLaunchLinks, setLastLaunchLinks] = useState<Array<{ assetKey: string; noteId?: string; status: string }>>([]);
  const selectedAssetKeys = useMemo(
    () => BOOK_A_CALL_LAUNCH_ASSETS.filter((asset) => selectedAssets[asset.key]).map((asset) => asset.key),
    [selectedAssets],
  );
  const estimatedCredits = BOOK_A_CALL_LAUNCH_ASSETS
    .filter((asset) => selectedAssets[asset.key])
    .reduce((sum, asset) => sum + asset.creditCost, 0);
  const selectedContext = contexts.find((context) => context.id === contextId);

  async function createFunnel(duplicateFromId?: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: duplicateFromId ? undefined : `Book a Call Funnel ${funnels.length + 1}`,
        contextId: contextId || null,
        builderKey,
        builderProjectUrl,
        duplicateFromId,
      }),
    });
    const body = (await response.json()) as { funnel?: FunnelRow; error?: string };
    setBusy(false);
    if (!response.ok || !body.funnel) {
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
      setMessage("Funnel settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Funnel settings did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFunnel() {
    if (funnels.length <= 1) {
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
      setMessage(body.error ?? "Funnel was not deleted.");
      return;
    }
    const next = funnels.find((funnel) => funnel.id !== activeFunnel.id);
    window.location.href = next ? `/funnels/book-a-call?funnel=${next.id}` : "/funnels/book-a-call";
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
        setMessage(body.error ?? "Launch failed.");
        return;
      }
      setLastLaunchLinks(body.results ?? []);
      setMessage(`Launch completed. Credits spent: ${body.spentCredits ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Launch failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#d8dee9] bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_190px_220px_auto] xl:items-end">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
              Funnel
            </span>
            <select
              value={activeFunnel.id}
              onChange={(event) => {
                window.location.href = `/funnels/book-a-call?funnel=${event.currentTarget.value}`;
              }}
              className="h-10 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
            >
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              className="h-10 w-full rounded-md border border-[#cfd8e6] px-3 text-sm outline-none focus:border-[#2f80ed]"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
              Builder
            </span>
            <select
              value={builderKey}
              onChange={(event) => setBuilderKey(event.currentTarget.value as BuilderKey)}
              className="h-10 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
            >
              {BUILDER_OPTIONS.map((builder) => (
                <option key={builder.key} value={builder.key}>{builder.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
              Builder Link
            </span>
            <input
              value={builderProjectUrl}
              onChange={(event) => setBuilderProjectUrl(event.currentTarget.value)}
              placeholder="https://..."
              className="h-10 w-full rounded-md border border-[#cfd8e6] px-3 text-sm outline-none focus:border-[#2f80ed]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => createFunnel()} disabled={busy} className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs font-semibold text-[#1d4ed8] disabled:opacity-60">
              Add
            </button>
            <button type="button" onClick={() => createFunnel(activeFunnel.id)} disabled={busy} className="rounded-md border border-[#d8dee9] bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#647084] disabled:opacity-60">
              Duplicate
            </button>
            <button type="button" onClick={deleteFunnel} disabled={busy} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">
              Delete
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-end">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
              Linked AI Context Doc
            </span>
            <select
              value={contextId}
              onChange={(event) => setContextId(event.currentTarget.value)}
              className="h-10 w-full rounded-md border border-[#cfd8e6] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
            >
              <option value="">Select confirmed context</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.title} {context.status === "confirmed" ? "" : "(draft)"}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md border border-[#d8dee9] bg-[#f8fafc] px-4 py-2 text-sm text-[#111827]">
            <span className="font-semibold">{creditAccount?.balance_credits ?? 0}</span> credits available
          </div>
          <button
            type="button"
            onClick={saveFunnel}
            disabled={busy}
            className="rounded-md border border-[#86efac] bg-[#ecfdf5] px-4 py-2 text-sm font-semibold text-[#047857] disabled:opacity-60"
          >
            Save Settings
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[#e5eaf2] bg-[#f8fafc] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">Launch Assets</h2>
              <p className="mt-1 text-xs text-[#647084]">
                Selected assets cost {estimatedCredits} credits.
                {selectedContext?.status !== "confirmed" ? " Confirm the linked context before launch." : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={launchFunnel}
              disabled={busy || !contextId || selectedContext?.status !== "confirmed" || selectedAssetKeys.length === 0}
              className="rounded-md bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working..." : "Launch"}
            </button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {BOOK_A_CALL_LAUNCH_ASSETS.map((asset) => (
              <label key={asset.key} className="flex items-center gap-2 rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedAssets[asset.key] ?? false}
                  onChange={(event) => {
                    setSelectedAssets((current) => ({ ...current, [asset.key]: event.currentTarget.checked }));
                  }}
                  className="h-4 w-4 rounded border-[#b8c2d2]"
                />
                <span className="min-w-0 flex-1 truncate">{asset.title}</span>
                <span className="text-xs text-[#8490a3]">{asset.creditCost}</span>
              </label>
            ))}
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-md border border-[#d8dee9] bg-white px-4 py-3 text-sm text-[#111827]" role="status">
            {message}
          </p>
        ) : null}
        {lastLaunchLinks.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {lastLaunchLinks.filter((result) => result.noteId).map((result) => (
              <a
                key={`${result.assetKey}-${result.noteId}`}
                href={`/notes?note=${result.noteId}`}
                className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs font-semibold text-[#1d4ed8]"
              >
                {result.assetKey} note
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <FunnelTracker funnelType="book-a-call" funnel={activeFunnel} steps={steps} />
    </div>
  );
}
