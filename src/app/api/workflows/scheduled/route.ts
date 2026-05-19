import { NextResponse } from "next/server";
import { constantTimeEquals } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const expectedSecret = process.env.SCHEDULE_WORKER_SECRET;
  const suppliedSecret = request.headers.get("x-schedule-worker-secret");

  if (!expectedSecret) {
    return NextResponse.json({ error: "Scheduled worker is not configured." }, { status: 503 });
  }

  if (!constantTimeEquals(suppliedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: schedules, error } = await admin
    .from("integration_workflow_schedules")
    .select("*")
    .eq("enabled", true)
    .is("archived_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const runs = [];
  for (const schedule of schedules ?? []) {
    const { data: run, error: runError } = await admin
      .from("integration_workflow_runs")
      .insert({
        tenant_id: schedule.tenant_id,
        schedule_id: schedule.id,
        workflow_key: schedule.workflow_key,
        target_provider:
          schedule.target_providers?.length > 1
            ? "both"
            : schedule.target_providers?.[0] ?? null,
        target_id: schedule.slack_channel_id ?? schedule.telegram_chat_id ?? null,
        status: "queued",
        output_metadata: { source: "scheduled_worker" },
      })
      .select("id")
      .single();

    if (!runError && run) runs.push(run);
  }

  return NextResponse.json({ ok: true, queued: runs.length });
}
