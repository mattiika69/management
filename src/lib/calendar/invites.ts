import type { SupabaseClient } from "@supabase/supabase-js";
import { getProviderAccessToken } from "@/lib/oauth/provider-oauth";

export type CalendarInviteInput = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location: string;
  meetingUrl?: string | null;
  organizerEmail: string;
  recipientEmails: string[];
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74));
    remaining = ` ${remaining.slice(74)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function formatIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function descriptionWithLink(input: CalendarInviteInput) {
  return [input.description, input.meetingUrl ? `Meeting link: ${input.meetingUrl}` : ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function buildIcsInvite(input: CalendarInviteInput & { uid: string }) {
  const attendees = input.recipientEmails.map((email) =>
    foldIcsLine(`ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${email}`),
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HyperOptimal//Management//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(input.startAt)}`,
    `DTEND:${formatIcsDate(input.endAt)}`,
    foldIcsLine(`SUMMARY:${escapeIcs(input.title)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcs(descriptionWithLink(input))}`),
    foldIcsLine(`LOCATION:${escapeIcs(input.location || input.meetingUrl || "")}`),
    foldIcsLine(`ORGANIZER:mailto:${input.organizerEmail}`),
    ...attendees,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

async function providerJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string }; message?: string };
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || "Calendar provider request failed.");
  }
  return body;
}

export async function createConnectedCalendarEvent(
  supabase: SupabaseClient,
  input: CalendarInviteInput & {
    tenantId: string;
    connectionId?: string | null;
    provider?: string | null;
  },
) {
  if (!input.connectionId || !input.provider) return null;

  if (input.provider === "google") {
    const accessToken = await getProviderAccessToken(supabase, {
      tenantId: input.tenantId,
      provider: "google_calendar",
      connectionId: input.connectionId,
    });
    const event = await providerJson<{ id?: string; htmlLink?: string }>(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: input.title,
          description: descriptionWithLink(input),
          location: input.location || input.meetingUrl || "",
          start: { dateTime: input.startAt, timeZone: input.timezone },
          end: { dateTime: input.endAt, timeZone: input.timezone },
          attendees: input.recipientEmails.map((email) => ({ email })),
        }),
      },
    );
    return { id: event.id ?? null, url: event.htmlLink ?? null };
  }

  if (input.provider === "microsoft") {
    const accessToken = await getProviderAccessToken(supabase, {
      tenantId: input.tenantId,
      provider: "microsoft_calendar",
      connectionId: input.connectionId,
    });
    const event = await providerJson<{ id?: string; webLink?: string }>(
      "https://graph.microsoft.com/v1.0/me/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: input.title,
          body: { contentType: "Text", content: descriptionWithLink(input) },
          location: { displayName: input.location || input.meetingUrl || "" },
          start: { dateTime: input.startAt.replace(/Z$/, ""), timeZone: input.timezone },
          end: { dateTime: input.endAt.replace(/Z$/, ""), timeZone: input.timezone },
          attendees: input.recipientEmails.map((email) => ({
            emailAddress: { address: email },
            type: "required",
          })),
        }),
      },
    );
    return { id: event.id ?? null, url: event.webLink ?? null };
  }

  return null;
}

export async function createZoomMeeting(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId?: string | null;
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    timezone: string;
    enableCloudRecording?: boolean;
  },
) {
  if (!input.connectionId) return null;
  const accessToken = await getProviderAccessToken(supabase, {
    tenantId: input.tenantId,
    provider: "zoom",
    connectionId: input.connectionId,
  });
  const durationMinutes = Math.max(
    1,
    Math.round((new Date(input.endAt).getTime() - new Date(input.startAt).getTime()) / 60000),
  );
  const meeting = await providerJson<{ id?: number; join_url?: string; start_url?: string }>(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: input.title,
        type: 2,
        start_time: input.startAt,
        duration: durationMinutes,
        timezone: input.timezone,
        agenda: input.description,
        settings: {
          join_before_host: false,
          auto_recording: input.enableCloudRecording ? "cloud" : "none",
        },
      }),
    },
  );
  return {
    id: meeting.id ? String(meeting.id) : null,
    joinUrl: meeting.join_url ?? null,
    startUrl: meeting.start_url ?? null,
  };
}
