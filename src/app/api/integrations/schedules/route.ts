import { NextResponse } from "next/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type SchedulePayload = {
  name?: string;
  workflowKey?: string;
  targetProviders?: string[];
  slackChannelId?: string;
  telegramChatId?: string;
  cadence?: string;
  customCron?: string;
  timezone?: string;
  messageTemplate?: string;
  config?: Record<string, unknown>;
};

const allowedCadences = new Set(["daily", "weekly", "monthly", "custom"]);
const allowedProviders = new Set(["slack", "telegram"]);

function normalizeProviders(value: unknown) {
  return Array.isArray(value)
    ? value.filter((provider): provider is string => {
        return typeof provider === "string" && allowedProviders.has(provider);
      })
    : [];
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("integration_workflow_schedules")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ schedules: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json()) as SchedulePayload;
    const name = body.name?.trim();
    const workflowKey = body.workflowKey?.trim();
    const cadence = allowedCadences.has(body.cadence ?? "") ? body.cadence : "weekly";

    if (!name || !workflowKey) {
      return NextResponse.json(
        { error: "Schedule name and workflow are required." },
        { status: 400 },
      );
    }

    const { data, error } = await context.supabase
      .from("integration_workflow_schedules")
      .insert({
        tenant_id: context.tenant.id,
        name,
        workflow_key: workflowKey,
        target_providers: normalizeProviders(body.targetProviders),
        slack_channel_id: body.slackChannelId?.trim() || null,
        telegram_chat_id: body.telegramChatId?.trim() || null,
        cadence,
        custom_cron: body.customCron?.trim() || null,
        timezone: body.timezone?.trim() || "America/New_York",
        message_template: body.messageTemplate?.trim() || null,
        config: body.config ?? {},
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "schedule.created", {
      targetTable: "integration_workflow_schedules",
      targetId: data.id,
    });

    return NextResponse.json({ schedule: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
