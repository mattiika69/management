"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

export type ZoomConnectionRow = {
  id: string;
  display_name: string;
  account_email: string;
  sync_enabled: boolean;
  cloud_recording_sync: boolean;
  default_meeting_duration_minutes: number;
  status: string;
};

const emptyForm = {
  displayName: "",
  accountEmail: "",
  syncEnabled: true,
  cloudRecordingSync: false,
  defaultMeetingDurationMinutes: 30,
};

export function ZoomSettings({
  initialZoomConnections,
  canManage,
  oauthReady = false,
}: {
  initialZoomConnections: ZoomConnectionRow[];
  canManage: boolean;
  oauthReady?: boolean;
}) {
  const [connections, setConnections] = useState(initialZoomConnections);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState("");

  async function addZoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/zoom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { zoomConnection?: ZoomConnectionRow; error?: string };
    setSaving(false);

    if (!response.ok || !body.zoomConnection) {
      setMessage(body.error ?? "Zoom account could not be saved.");
      return;
    }

    setConnections((current) => [body.zoomConnection as ZoomConnectionRow, ...current]);
    setForm(emptyForm);
    setMessage("Zoom account saved.");
  }

  async function toggleZoom(connection: ZoomConnectionRow) {
    if (!canManage) return;
    const response = await fetch(`/api/zoom/${connection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncEnabled: !connection.sync_enabled }),
    });
    const body = (await response.json()) as { zoomConnection?: ZoomConnectionRow; error?: string };
    if (!response.ok || !body.zoomConnection) {
      setMessage(body.error ?? "Zoom account could not be updated.");
      return;
    }
    setConnections((current) => current.map((item) => (item.id === connection.id ? body.zoomConnection as ZoomConnectionRow : item)));
  }

  async function archiveZoom(id: string) {
    if (!canManage) return;
    const response = await fetch(`/api/zoom/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Zoom account could not be removed.");
      return;
    }
    setConnections((current) => current.filter((connection) => connection.id !== id));
  }

  async function syncRecordings(connection: ZoomConnectionRow) {
    if (!canManage) return;
    setSyncing(connection.id);
    setMessage("");
    const response = await fetch("/api/zoom/recordings/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoomConnectionId: connection.id }),
    });
    const body = (await response.json().catch(() => ({}))) as { syncedCount?: number; error?: string };
    setSyncing("");
    if (!response.ok) {
      setMessage(body.error ?? "Recordings could not be synced.");
      return;
    }
    setMessage(`Synced ${body.syncedCount ?? 0} recording${body.syncedCount === 1 ? "" : "s"}.`);
  }

  return (
    <section className="settings-page">
      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={addZoom} className="settings-card-pad">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[15px] font-bold text-gray-950">Add Zoom Account</h2>
            {oauthReady ? (
              <Link prefetch={false} href="/api/zoom/oauth/start?returnTo=/settings/zoom" className="settings-button-outline">
                Connect Zoom
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Name
              <input className="settings-field w-full normal-case" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Operations Zoom" required />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Account Email
              <input className="settings-field w-full normal-case" type="email" value={form.accountEmail} onChange={(event) => setForm({ ...form, accountEmail: event.target.value })} placeholder="zoom@company.com" required />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Default Duration
              <input className="settings-field w-full normal-case" type="number" min={5} max={480} value={form.defaultMeetingDurationMinutes} onChange={(event) => setForm({ ...form, defaultMeetingDurationMinutes: Number(event.target.value) })} />
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700">
              <input type="checkbox" checked={form.syncEnabled} onChange={(event) => setForm({ ...form, syncEnabled: event.target.checked })} />
              Sync enabled
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700">
              <input type="checkbox" checked={form.cloudRecordingSync} onChange={(event) => setForm({ ...form, cloudRecordingSync: event.target.checked })} />
              Cloud recordings
            </label>
          </div>
          <button disabled={!canManage || saving} className="settings-button-dark mt-4 w-full">
            {saving ? "Saving..." : "Add Zoom"}
          </button>
          {message ? <p className="mt-3 text-[12px] font-medium text-gray-600">{message}</p> : null}
        </form>

        <section className="settings-card overflow-hidden">
          <div className="settings-table-head grid grid-cols-[1fr_0.7fr_0.8fr_0.7fr_160px] gap-3 border-b border-[#ebe3d8] px-4 py-3">
            <span>Zoom</span>
            <span>Duration</span>
            <span>Recordings</span>
            <span>Status</span>
            <span />
          </div>
          {connections.length ? (
            connections.map((connection) => (
              <div key={connection.id} className="grid grid-cols-[1fr_0.7fr_0.8fr_0.7fr_160px] gap-3 border-b border-gray-100 px-4 py-3 text-[12px] text-gray-700 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-950">{connection.display_name}</p>
                  <p className="truncate text-[11px] text-gray-500">{connection.account_email}</p>
                </div>
                <span>{connection.default_meeting_duration_minutes} min</span>
                <span>{connection.cloud_recording_sync ? "On" : "Off"}</span>
                <span>{connection.sync_enabled ? "On" : "Paused"}</span>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => syncRecordings(connection)} disabled={syncing === connection.id} className="text-[11px] font-semibold text-blue-700 disabled:text-gray-400">
                    {syncing === connection.id ? "Syncing" : "Sync"}
                  </button>
                  <button type="button" onClick={() => toggleZoom(connection)} className="text-[11px] font-semibold text-blue-700">
                    {connection.sync_enabled ? "Pause" : "Resume"}
                  </button>
                  <button type="button" onClick={() => archiveZoom(connection.id)} className="text-[11px] font-semibold text-red-600">
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-[13px] text-gray-500">No Zoom accounts connected yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
