"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export type CalendarConnectionRow = {
  id: string;
  provider: string;
  display_name: string;
  account_email: string;
  sync_direction: string;
  sync_enabled: boolean;
  include_events: boolean;
  include_tasks: boolean;
  color: string;
  status: string;
};

const emptyForm = {
  provider: "google",
  displayName: "",
  accountEmail: "",
  syncDirection: "two_way",
  syncEnabled: true,
  includeEvents: true,
  includeTasks: false,
  color: "#2563eb",
};

export function CalendarSettings({
  initialCalendars,
  canManage,
}: {
  initialCalendars: CalendarConnectionRow[];
  canManage: boolean;
}) {
  const [calendars, setCalendars] = useState(initialCalendars);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { calendar?: CalendarConnectionRow; error?: string };
    setSaving(false);

    if (!response.ok || !body.calendar) {
      setMessage(body.error ?? "Calendar could not be saved.");
      return;
    }

    setCalendars((current) => [body.calendar as CalendarConnectionRow, ...current]);
    setForm(emptyForm);
    setMessage("Calendar saved.");
  }

  async function toggleCalendar(calendar: CalendarConnectionRow) {
    if (!canManage) return;
    const response = await fetch(`/api/calendars/${calendar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncEnabled: !calendar.sync_enabled }),
    });
    const body = (await response.json()) as { calendar?: CalendarConnectionRow; error?: string };
    if (!response.ok || !body.calendar) {
      setMessage(body.error ?? "Calendar could not be updated.");
      return;
    }
    setCalendars((current) => current.map((item) => (item.id === calendar.id ? body.calendar as CalendarConnectionRow : item)));
  }

  async function archiveCalendar(id: string) {
    if (!canManage) return;
    const response = await fetch(`/api/calendars/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Calendar could not be removed.");
      return;
    }
    setCalendars((current) => current.filter((calendar) => calendar.id !== id));
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={addCalendar} className="rounded-[6px] border border-gray-300 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold text-gray-950">Add Calendar</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Provider
              <select className="h-9 rounded-[4px] border border-gray-300 px-2 text-[13px] font-medium normal-case text-gray-950" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}>
                <option value="google">Google</option>
                <option value="microsoft">Microsoft</option>
                <option value="apple">Apple</option>
                <option value="caldav">CalDAV</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Name
              <input className="h-9 rounded-[4px] border border-gray-300 px-3 text-[13px] font-medium normal-case text-gray-950" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Operations Calendar" required />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Account Email
              <input className="h-9 rounded-[4px] border border-gray-300 px-3 text-[13px] font-medium normal-case text-gray-950" type="email" value={form.accountEmail} onChange={(event) => setForm({ ...form, accountEmail: event.target.value })} placeholder="calendar@company.com" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
                Sync
                <select className="h-9 rounded-[4px] border border-gray-300 px-2 text-[13px] font-medium normal-case text-gray-950" value={form.syncDirection} onChange={(event) => setForm({ ...form, syncDirection: event.target.value })}>
                  <option value="two_way">Two-way</option>
                  <option value="import_only">Import only</option>
                  <option value="export_only">Export only</option>
                </select>
              </label>
              <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
                Color
                <input className="h-9 rounded-[4px] border border-gray-300 px-2 text-[13px] font-medium normal-case text-gray-950" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700">
              <input type="checkbox" checked={form.includeEvents} onChange={(event) => setForm({ ...form, includeEvents: event.target.checked })} />
              Events
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700">
              <input type="checkbox" checked={form.includeTasks} onChange={(event) => setForm({ ...form, includeTasks: event.target.checked })} />
              Tasks
            </label>
          </div>
          <button disabled={!canManage || saving} className="mt-4 h-9 w-full rounded-[5px] bg-gray-950 px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400">
            {saving ? "Saving..." : "Add Calendar"}
          </button>
          {message ? <p className="mt-3 text-[12px] font-medium text-gray-600">{message}</p> : null}
        </form>

        <section className="overflow-hidden rounded-[6px] border border-gray-300 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_0.8fr_0.9fr_0.7fr_112px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-bold uppercase text-gray-600">
            <span>Calendar</span>
            <span>Provider</span>
            <span>Sync</span>
            <span>Status</span>
            <span />
          </div>
          {calendars.length ? (
            calendars.map((calendar) => (
              <div key={calendar.id} className="grid grid-cols-[1fr_0.8fr_0.9fr_0.7fr_112px] gap-3 border-b border-gray-100 px-4 py-3 text-[12px] text-gray-700 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-950">{calendar.display_name}</p>
                  <p className="truncate text-[11px] text-gray-500">{calendar.account_email}</p>
                </div>
                <span className="capitalize">{calendar.provider}</span>
                <span>{calendar.sync_direction.replace("_", " ")}</span>
                <span>{calendar.sync_enabled ? "On" : "Paused"}</span>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => toggleCalendar(calendar)} className="text-[11px] font-semibold text-blue-700">
                    {calendar.sync_enabled ? "Pause" : "Resume"}
                  </button>
                  <button type="button" onClick={() => archiveCalendar(calendar.id)} className="text-[11px] font-semibold text-red-600">
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-[13px] text-gray-500">No calendars connected yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
