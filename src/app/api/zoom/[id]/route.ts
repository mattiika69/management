import { NextResponse } from "next/server";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

type ZoomPayload = {
  displayName?: string;
  accountEmail?: string;
  syncEnabled?: boolean;
  cloudRecordingSync?: boolean;
  defaultMeetingDurationMinutes?: number;
  status?: string;
};

const statuses = new Set(["connected", "needs_reauth", "paused"]);

function zoomPatch(payload: ZoomPayload, userId: string) {
  const patch: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.displayName !== undefined) {
    const displayName = payload.displayName.trim();
    if (!displayName) return { error: "Zoom account name is required." };
    patch.display_name = displayName;
  }
  if (payload.accountEmail !== undefined) {
    const accountEmail = payload.accountEmail.trim().toLowerCase();
    if (!accountEmail) return { error: "Zoom account email is required." };
    patch.account_email = accountEmail;
  }
  if (payload.syncEnabled !== undefined) patch.sync_enabled = payload.syncEnabled;
  if (payload.cloudRecordingSync !== undefined) patch.cloud_recording_sync = payload.cloudRecordingSync;
  if (payload.defaultMeetingDurationMinutes !== undefined) {
    patch.default_meeting_duration_minutes = payload.defaultMeetingDurationMinutes;
  }
  if (payload.status !== undefined && statuses.has(payload.status)) patch.status = payload.status;

  return { data: patch };
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const { id } = await params;
    const payload = (await request.json()) as ZoomPayload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = zoomPatch(payload, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("zoom_connections")
      .update(prepared.data)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .select("id,display_name,account_email,sync_enabled,cloud_recording_sync,default_meeting_duration_minutes,status,last_synced_at,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "zoom.updated", {
      targetTable: "zoom_connections",
      targetId: id,
    });

    return NextResponse.json({ zoomConnection: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const { error } = await context.supabase
      .from("zoom_connections")
      .update({ archived_at: new Date().toISOString(), updated_by_user_id: context.user.id })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);

    await auditAction(context, "zoom.archived", {
      targetTable: "zoom_connections",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
