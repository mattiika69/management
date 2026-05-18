"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

export type CalendarInviteCalendar = {
  id: string;
  provider: string;
  display_name: string;
  account_email: string;
  sync_enabled: boolean;
};

export type CalendarInviteZoom = {
  id: string;
  display_name: string;
  account_email: string;
  sync_enabled: boolean;
  cloud_recording_sync: boolean;
};

type InviteResponse = {
  ok?: boolean;
  error?: string;
  sentCount?: number;
  meetingUrl?: string | null;
};

const defaultStart = () => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date.toISOString().slice(0, 16);
};

const defaultEnd = () => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 2);
  return date.toISOString().slice(0, 16);
};

function splitEmails(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CalendarInviteForm({
  calendars,
  zoomConnections,
}: {
  calendars: CalendarInviteCalendar[];
  zoomConnections: CalendarInviteZoom[];
}) {
  const activeCalendars = calendars.filter((calendar) => calendar.sync_enabled);
  const activeZoom = zoomConnections.filter((connection) => connection.sync_enabled);
  const [title, setTitle] = useState("New Meeting");
  const [recipients, setRecipients] = useState("");
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [timezone, setTimezone] = useState("America/New_York");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [calendarConnectionId, setCalendarConnectionId] = useState(activeCalendars[0]?.id ?? "");
  const [zoomConnectionId, setZoomConnectionId] = useState(activeZoom[0]?.id ?? "");
  const [createZoomMeeting, setCreateZoomMeeting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recipientCount = useMemo(() => splitEmails(recipients).length, [recipients]);

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/calendar/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        timezone,
        location,
        recipientEmails: splitEmails(recipients),
        calendarConnectionId: calendarConnectionId || null,
        zoomConnectionId: zoomConnectionId || null,
        createZoomMeeting,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as InviteResponse;
    setSaving(false);

    if (!response.ok || !body.ok) {
      setError(body.error ?? "Invite could not be sent.");
      return;
    }

    setMessage(
      body.meetingUrl
        ? `Sent ${body.sentCount ?? recipientCount} invite${(body.sentCount ?? recipientCount) === 1 ? "" : "s"} with a Zoom link.`
        : `Sent ${body.sentCount ?? recipientCount} invite${(body.sentCount ?? recipientCount) === 1 ? "" : "s"}.`,
    );
  }

  return (
    <section className="settings-card-pad">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-gray-950">Send calendar invite</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-gray-600">
            Send an invite by email and attach it to a connected calendar when one is selected.
          </p>
        </div>
        <span className="rounded-full border border-[#d9e1ee] bg-[#f8fafc] px-3 py-1 text-[11px] font-semibold text-[#475467]">
          {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
        </span>
      </div>

      <form onSubmit={sendInvite} className="mt-5 grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Title
            <input className="settings-field w-full normal-case" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Start
            <input className="settings-field w-full normal-case" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            End
            <input className="settings-field w-full normal-case" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required />
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_240px]">
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Recipients
            <input className="settings-field w-full normal-case" value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder="name@company.com, client@example.com" required />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Calendar
            <select className="settings-field w-full normal-case" value={calendarConnectionId} onChange={(event) => setCalendarConnectionId(event.target.value)}>
              <option value="">Email invite only</option>
              {activeCalendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Zoom
            <select className="settings-field w-full normal-case" value={zoomConnectionId} onChange={(event) => setZoomConnectionId(event.target.value)}>
              <option value="">No Zoom meeting</option>
              {activeZoom.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.display_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Timezone
            <input className="settings-field w-full normal-case" value={timezone} onChange={(event) => setTimezone(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
            Location
            <input className="settings-field w-full normal-case" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Office, conference room, or meeting link" />
          </label>
        </div>

        <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
          Notes
          <textarea className="settings-field min-h-[92px] w-full normal-case" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Agenda, notes, or call context" />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-700">
            <input type="checkbox" checked={createZoomMeeting} onChange={(event) => setCreateZoomMeeting(event.target.checked)} disabled={!zoomConnectionId} />
            Create Zoom meeting when possible
          </label>
          <button className="settings-button-dark" disabled={saving}>
            {saving ? "Sending..." : "Send Invite"}
          </button>
        </div>

        {message ? <p className="text-[12px] font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="text-[12px] font-semibold text-red-600">{error}</p> : null}
      </form>
    </section>
  );
}
