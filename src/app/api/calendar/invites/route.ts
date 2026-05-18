import { NextResponse } from "next/server";
import { buildIcsInvite, createConnectedCalendarEvent, createZoomMeeting } from "@/lib/calendar/invites";
import { getResend, getResendFromEmail, normalizeEmailList } from "@/lib/resend/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { auditAction, jsonError, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  recipientEmails?: string[];
  calendarConnectionId?: string | null;
  zoomConnectionId?: string | null;
  createZoomMeeting?: boolean;
};

type CalendarConnection = {
  id: string;
  provider: string;
  account_email: string;
  display_name: string;
  provider_account_id: string | null;
};

type ZoomConnection = {
  id: string;
  cloud_recording_sync: boolean;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown) {
  const date = cleanText(value);
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function extractEmail(value: string) {
  return value.match(/<([^>]+)>/)?.[1] ?? value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailHtml(input: { title: string; description: string; startAt: string; endAt: string; timezone: string; location: string; meetingUrl?: string | null }) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: input.timezone,
  });
  const lines = [
    `<p>${escapeHtml(input.description || "You have been invited to a meeting.")}</p>`,
    `<p><strong>When:</strong> ${formatter.format(new Date(input.startAt))} - ${formatter.format(new Date(input.endAt))}</p>`,
    input.location ? `<p><strong>Location:</strong> ${escapeHtml(input.location)}</p>` : "",
    input.meetingUrl ? `<p><strong>Meeting link:</strong> <a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a></p>` : "",
  ].filter(Boolean);
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">${lines.join("")}</div>`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    const admin = createAdminClient();

    const title = cleanText(payload.title);
    const description = cleanText(payload.description);
    const timezone = cleanText(payload.timezone) || "America/New_York";
    const location = cleanText(payload.location);
    const recipientEmails = normalizeEmailList(payload.recipientEmails);
    const startAt = parseDate(payload.startAt);
    const endAt = parseDate(payload.endAt);

    if (!title || !startAt || !endAt || !recipientEmails.length) {
      return NextResponse.json(
        { error: "Title, start time, end time, and at least one recipient are required." },
        { status: 400 },
      );
    }

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
    }

    const calendarConnectionId = cleanText(payload.calendarConnectionId) || null;
    const zoomConnectionId = cleanText(payload.zoomConnectionId) || null;

    const [calendarResult, zoomResult] = await Promise.all([
      calendarConnectionId
        ? admin
            .from("calendar_connections")
            .select("id,provider,account_email,display_name,provider_account_id")
            .eq("id", calendarConnectionId)
            .eq("tenant_id", context.tenant.id)
            .is("archived_at", null)
            .maybeSingle<CalendarConnection>()
        : Promise.resolve({ data: null, error: null }),
      zoomConnectionId
        ? admin
            .from("zoom_connections")
            .select("id,cloud_recording_sync")
            .eq("id", zoomConnectionId)
            .eq("tenant_id", context.tenant.id)
            .is("archived_at", null)
            .maybeSingle<ZoomConnection>()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (calendarResult.error) throw new Error(calendarResult.error.message);
    if (zoomResult.error) throw new Error(zoomResult.error.message);

    const from = getResendFromEmail();
    const resend = getResend();
    let meetingUrl: string | null = null;
    let zoomMeetingId: string | null = null;
    if (payload.createZoomMeeting && zoomResult.data?.id) {
      const zoomMeeting = await createZoomMeeting(admin, {
        tenantId: context.tenant.id,
        connectionId: zoomResult.data.id,
        title,
        description,
        startAt,
        endAt,
        timezone,
        enableCloudRecording: zoomResult.data.cloud_recording_sync,
      });
      meetingUrl = zoomMeeting?.joinUrl ?? null;
      zoomMeetingId = zoomMeeting?.id ?? null;
    }

    const { data: invite, error: inviteError } = await context.supabase
      .from("calendar_invites")
      .insert({
        tenant_id: context.tenant.id,
        organization_id: context.tenant.id,
        calendar_connection_id: calendarResult.data?.id ?? null,
        zoom_connection_id: zoomResult.data?.id ?? null,
        title,
        description,
        start_at: startAt,
        end_at: endAt,
        timezone,
        location,
        meeting_url: meetingUrl,
        recipient_emails: recipientEmails,
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
        metadata: { zoom_meeting_id: zoomMeetingId },
      })
      .select("id")
      .single<{ id: string }>();

    if (inviteError) throw new Error(inviteError.message);

    const organizerEmail = calendarResult.data?.account_email || context.user.email || extractEmail(from);
    let providerEvent: Awaited<ReturnType<typeof createConnectedCalendarEvent>> = null;
    let providerEventError: string | null = null;
    if (calendarResult.data?.id) {
      try {
        providerEvent = await createConnectedCalendarEvent(admin, {
          tenantId: context.tenant.id,
          connectionId: calendarResult.data.id,
          provider: calendarResult.data.provider,
          providerAccountId: calendarResult.data.provider_account_id,
          title,
          description,
          startAt,
          endAt,
          timezone,
          location,
          meetingUrl,
          organizerEmail,
          recipientEmails,
        });
      } catch (error) {
        providerEventError = error instanceof Error ? error.message : "Calendar event could not be created.";
      }
    }

    const ics = buildIcsInvite({
      uid: `${invite.id}@hyperoptimal.management`,
      title,
      description,
      startAt,
      endAt,
      timezone,
      location,
      meetingUrl,
      organizerEmail,
      recipientEmails,
    });

    const html = emailHtml({ title, description, startAt, endAt, timezone, location, meetingUrl });
    const text = [
      description || "You have been invited to a meeting.",
      `When: ${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleString()}`,
      location ? `Location: ${location}` : "",
      meetingUrl ? `Meeting link: ${meetingUrl}` : "",
    ].filter(Boolean).join("\n\n");

    let sentCount = 0;
    let lastError = "";
    for (const to of recipientEmails) {
      const { data: emailMessage, error: emailInsertError } = await context.supabase
        .from("email_messages")
        .insert({
          organization_id: context.tenant.id,
          tenant_id: context.tenant.id,
          created_by: context.user.id,
          to_email: to,
          subject: title,
          text_body: text,
          html_body: html,
          metadata: { source: "calendar_invite", calendar_invite_id: invite.id },
        })
        .select("id")
        .single<{ id: string }>();
      if (emailInsertError) throw new Error(emailInsertError.message);

      try {
        const result = await resend.emails.send({
          from,
          to,
          subject: title,
          html,
          text,
          attachments: [
            {
              filename: "calendar-invite.ics",
              content: Buffer.from(ics),
              contentType: "text/calendar; method=REQUEST; charset=UTF-8",
            },
          ],
        });

        if (result.error) throw new Error(result.error.message);
        sentCount += 1;
        await context.supabase
          .from("email_messages")
          .update({
            status: "sent",
            external_message_id: result.data?.id,
            metadata: { source: "calendar_invite", calendar_invite_id: invite.id, provider_response: result.data },
          })
          .eq("id", emailMessage.id);
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Email send failed.";
        await context.supabase
          .from("email_messages")
          .update({
            status: "failed",
            error_message: lastError,
            metadata: { source: "calendar_invite", calendar_invite_id: invite.id, error: lastError },
          })
          .eq("id", emailMessage.id);
      }
    }

    const status = sentCount === recipientEmails.length ? "sent" : "failed";
    await context.supabase
      .from("calendar_invites")
      .update({
        status,
        sent_count: sentCount,
        provider_event_id: providerEvent?.id ?? null,
        error_message: status === "failed" ? lastError || "One or more invites could not be sent." : null,
        metadata: {
          zoom_meeting_id: zoomMeetingId,
          provider_event_url: providerEvent?.url ?? null,
          provider_event_error: providerEventError,
        },
      })
      .eq("id", invite.id);

    await auditAction(context, "calendar_invite.sent", {
      targetTable: "calendar_invites",
      targetId: invite.id,
      metadata: { sent_count: sentCount, recipient_count: recipientEmails.length },
    });

    if (status === "failed") {
      return NextResponse.json(
        { error: lastError || "One or more invites could not be sent.", sentCount },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, inviteId: invite.id, sentCount, meetingUrl });
  } catch (error) {
    return jsonError(error);
  }
}
