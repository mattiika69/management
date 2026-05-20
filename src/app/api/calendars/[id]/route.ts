import { NextResponse } from "next/server";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

type CalendarPayload = {
  provider?: string;
  displayName?: string;
  accountEmail?: string;
  syncDirection?: string;
  syncEnabled?: boolean;
  includeEvents?: boolean;
  includeTasks?: boolean;
  color?: string;
  status?: string;
};

const providers = new Set(["google", "microsoft", "nylas", "apple", "caldav", "other"]);
const directions = new Set(["two_way", "import_only", "export_only"]);
const statuses = new Set(["connected", "needs_reauth", "paused"]);

function calendarPatch(payload: CalendarPayload, userId: string) {
  const patch: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.displayName !== undefined) {
    const displayName = payload.displayName.trim();
    if (!displayName) return { error: "Calendar name is required." };
    patch.display_name = displayName;
  }
  if (payload.accountEmail !== undefined) {
    const accountEmail = payload.accountEmail.trim().toLowerCase();
    if (!accountEmail) return { error: "Calendar account email is required." };
    patch.account_email = accountEmail;
  }
  if (payload.provider !== undefined && providers.has(payload.provider)) patch.provider = payload.provider;
  if (payload.syncDirection !== undefined && directions.has(payload.syncDirection)) {
    patch.sync_direction = payload.syncDirection;
  }
  if (payload.status !== undefined && statuses.has(payload.status)) patch.status = payload.status;
  if (payload.syncEnabled !== undefined) patch.sync_enabled = payload.syncEnabled;
  if (payload.includeEvents !== undefined) patch.include_events = payload.includeEvents;
  if (payload.includeTasks !== undefined) patch.include_tasks = payload.includeTasks;
  if (payload.color !== undefined) patch.color = payload.color.trim() || "#2563eb";

  return { data: patch };
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const { id } = await params;
    const payload = (await request.json()) as CalendarPayload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = calendarPatch(payload, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("calendar_connections")
      .update(prepared.data)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .select("id,provider,display_name,account_email,sync_direction,sync_enabled,include_events,include_tasks,color,status,last_synced_at,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "calendar.updated", {
      targetTable: "calendar_connections",
      targetId: id,
    });

    return NextResponse.json({ calendar: data });
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
      .from("calendar_connections")
      .update({ archived_at: new Date().toISOString(), updated_by_user_id: context.user.id })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);

    await auditAction(context, "calendar.archived", {
      targetTable: "calendar_connections",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
