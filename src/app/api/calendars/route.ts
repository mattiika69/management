import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type CalendarPayload = {
  provider?: string;
  displayName?: string;
  accountEmail?: string;
  syncDirection?: string;
  syncEnabled?: boolean;
  includeEvents?: boolean;
  includeTasks?: boolean;
  color?: string;
};

const providers = new Set(["google", "microsoft", "apple", "caldav", "other"]);
const directions = new Set(["two_way", "import_only", "export_only"]);

function calendarInsert(payload: CalendarPayload, tenantId: string, userId: string) {
  const displayName = payload.displayName?.trim();
  const accountEmail = payload.accountEmail?.trim().toLowerCase();

  if (!displayName || !accountEmail) {
    return { error: "Calendar name and account email are required." };
  }

  return {
    data: {
      tenant_id: tenantId,
      organization_id: tenantId,
      provider: providers.has(payload.provider ?? "") ? payload.provider : "google",
      display_name: displayName,
      account_email: accountEmail,
      sync_direction: directions.has(payload.syncDirection ?? "") ? payload.syncDirection : "two_way",
      sync_enabled: payload.syncEnabled ?? true,
      include_events: payload.includeEvents ?? true,
      include_tasks: payload.includeTasks ?? false,
      color: payload.color?.trim() || "#2563eb",
      created_by_user_id: userId,
      updated_by_user_id: userId,
    },
  };
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("calendar_connections")
      .select("id,provider,display_name,account_email,sync_direction,sync_enabled,include_events,include_tasks,color,status,last_synced_at,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ calendars: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CalendarPayload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = calendarInsert(payload, context.tenant.id, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("calendar_connections")
      .insert(prepared.data)
      .select("id,provider,display_name,account_email,sync_direction,sync_enabled,include_events,include_tasks,color,status,last_synced_at,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "calendar.connected", {
      targetTable: "calendar_connections",
      targetId: data.id,
      metadata: { provider: data.provider, account_email: data.account_email },
    });

    return NextResponse.json({ calendar: data });
  } catch (error) {
    return jsonError(error);
  }
}
