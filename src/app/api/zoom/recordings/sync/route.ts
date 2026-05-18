import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/oauth/provider-oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  zoomConnectionId?: string;
};

type ZoomConnection = {
  id: string;
};

type ZoomRecordingFile = {
  id?: string;
  meeting_id?: string;
  recording_start?: string;
  recording_end?: string;
  file_type?: string;
  play_url?: string;
  download_url?: string;
  status?: string;
};

type ZoomRecordingMeeting = {
  uuid?: string;
  id?: number;
  topic?: string;
  start_time?: string;
  duration?: number;
  share_url?: string;
  recording_files?: ZoomRecordingFile[];
};

type ZoomRecordingsResponse = {
  meetings?: ZoomRecordingMeeting[];
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function zoomJson<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(body.message || "Zoom recording sync failed.");
  return body;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Payload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const admin = createAdminClient();

    const requestedId = payload.zoomConnectionId?.trim();
    const query = admin
      .from("zoom_connections")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("sync_enabled", true)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1);
    const { data: connection, error } = requestedId
      ? await admin
          .from("zoom_connections")
          .select("id")
          .eq("id", requestedId)
          .eq("tenant_id", context.tenant.id)
          .eq("sync_enabled", true)
          .is("archived_at", null)
          .maybeSingle<ZoomConnection>()
      : await query.maybeSingle<ZoomConnection>();

    if (error) throw new Error(error.message);
    if (!connection?.id) {
      return NextResponse.json({ error: "Connect Zoom before syncing recordings." }, { status: 400 });
    }

    const accessToken = await getProviderAccessToken(admin, {
      tenantId: context.tenant.id,
      provider: "zoom",
      connectionId: connection.id,
    });

    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const url = new URL("https://api.zoom.us/v2/users/me/recordings");
    url.searchParams.set("from", dateOnly(from));
    url.searchParams.set("to", dateOnly(now));
    url.searchParams.set("page_size", "30");

    const recordings = await zoomJson<ZoomRecordingsResponse>(url.toString(), accessToken);
    const rows = (recordings.meetings ?? [])
      .map((meeting) => ({
        tenant_id: context.tenant.id,
        organization_id: context.tenant.id,
        zoom_connection_id: connection.id,
        meeting_uuid: meeting.uuid ?? "",
        meeting_id: meeting.id ? String(meeting.id) : null,
        topic: meeting.topic ?? "Zoom recording",
        start_time: meeting.start_time ?? null,
        duration_minutes: meeting.duration ?? null,
        recording_count: meeting.recording_files?.length ?? 0,
        share_url: meeting.share_url ?? meeting.recording_files?.find((file) => file.play_url)?.play_url ?? null,
        metadata: { recording_files: meeting.recording_files ?? [] },
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      }))
      .filter((row) => row.meeting_uuid);

    if (rows.length) {
      const { error: upsertError } = await admin
        .from("zoom_recordings")
        .upsert(rows, { onConflict: "tenant_id,zoom_connection_id,meeting_uuid" });
      if (upsertError) throw new Error(upsertError.message);
    }

    await admin
      .from("zoom_connections")
      .update({ last_synced_at: new Date().toISOString(), updated_by_user_id: context.user.id })
      .eq("id", connection.id)
      .eq("tenant_id", context.tenant.id);

    await auditAction(context, "zoom_recordings.synced", {
      targetTable: "zoom_connections",
      targetId: connection.id,
      metadata: { synced_count: rows.length },
    });

    return NextResponse.json({ ok: true, syncedCount: rows.length });
  } catch (error) {
    return jsonError(error);
  }
}
