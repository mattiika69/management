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

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { data: schedule, error: scheduleError } = await context.supabase
      .from("integration_workflow_schedules")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .single();

    if (scheduleError) throw new Error(scheduleError.message);

    const { data: run, error: runError } = await context.supabase
      .from("integration_workflow_runs")
      .insert({
        tenant_id: context.tenant.id,
        schedule_id: id,
        workflow_key: schedule.workflow_key,
        target_provider:
          schedule.target_providers?.length > 1
            ? "both"
            : schedule.target_providers?.[0] ?? null,
        target_id: schedule.slack_channel_id ?? schedule.telegram_chat_id ?? null,
        status: "queued",
        output_metadata: { source: "manual_run" },
        created_by_user_id: context.user.id,
      })
      .select("*")
      .single();

    if (runError) throw new Error(runError.message);

    await context.supabase.from("integration_workflow_run_events").insert({
      tenant_id: context.tenant.id,
      run_id: run.id,
      event_type: "queued",
      status: "queued",
      metadata: { source: "manual_run" },
    });

    await auditAction(context, "schedule.run_requested", {
      targetTable: "integration_workflow_runs",
      targetId: run.id,
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
