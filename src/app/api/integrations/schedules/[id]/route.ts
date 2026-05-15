import { NextResponse } from "next/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      enabled?: boolean;
      cadence?: string;
      timezone?: string;
      messageTemplate?: string;
    };
    const patch: Record<string, unknown> = {
      updated_by_user_id: context.user.id,
    };

    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.cadence === "string") patch.cadence = body.cadence;
    if (typeof body.timezone === "string") patch.timezone = body.timezone.trim();
    if (typeof body.messageTemplate === "string") {
      patch.message_template = body.messageTemplate.trim() || null;
    }

    const { data, error } = await context.supabase
      .from("integration_workflow_schedules")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "schedule.updated", {
      targetTable: "integration_workflow_schedules",
      targetId: id,
    });

    return NextResponse.json({ schedule: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { error } = await context.supabase
      .from("integration_workflow_schedules")
      .update({
        archived_at: new Date().toISOString(),
        enabled: false,
        updated_by_user_id: context.user.id,
      })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) throw new Error(error.message);

    await auditAction(context, "schedule.archived", {
      targetTable: "integration_workflow_schedules",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
