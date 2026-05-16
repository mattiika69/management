import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type ZoomPayload = {
  displayName?: string;
  accountEmail?: string;
  syncEnabled?: boolean;
  cloudRecordingSync?: boolean;
  defaultMeetingDurationMinutes?: number;
};

function zoomInsert(payload: ZoomPayload, tenantId: string, userId: string) {
  const displayName = payload.displayName?.trim();
  const accountEmail = payload.accountEmail?.trim().toLowerCase();

  if (!displayName || !accountEmail) {
    return { error: "Zoom account name and email are required." };
  }

  return {
    data: {
      tenant_id: tenantId,
      organization_id: tenantId,
      display_name: displayName,
      account_email: accountEmail,
      sync_enabled: payload.syncEnabled ?? true,
      cloud_recording_sync: payload.cloudRecordingSync ?? false,
      default_meeting_duration_minutes: payload.defaultMeetingDurationMinutes ?? 30,
      created_by_user_id: userId,
      updated_by_user_id: userId,
    },
  };
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("zoom_connections")
      .select("id,display_name,account_email,sync_enabled,cloud_recording_sync,default_meeting_duration_minutes,status,last_synced_at,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ zoomConnections: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ZoomPayload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = zoomInsert(payload, context.tenant.id, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("zoom_connections")
      .insert(prepared.data)
      .select("id,display_name,account_email,sync_enabled,cloud_recording_sync,default_meeting_duration_minutes,status,last_synced_at,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "zoom.connected", {
      targetTable: "zoom_connections",
      targetId: data.id,
      metadata: { account_email: data.account_email },
    });

    return NextResponse.json({ zoomConnection: data });
  } catch (error) {
    return jsonError(error);
  }
}
