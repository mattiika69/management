import { NextResponse } from "next/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { data, error } = await context.supabase
      .from("agent_requests")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json()) as {
      requestText?: string;
      sourceProvider?: "web" | "slack" | "telegram";
      riskLevel?: "low" | "normal" | "high";
      metadata?: Record<string, unknown>;
    };
    const requestText = body.requestText?.trim();

    if (!requestText) {
      return NextResponse.json({ error: "Request text is required." }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("agent_requests")
      .insert({
        tenant_id: context.tenant.id,
        requested_by_user_id: context.user.id,
        source_provider: body.sourceProvider ?? "web",
        request_text: requestText,
        risk_level: body.riskLevel ?? "normal",
        metadata: body.metadata ?? {},
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "agent.request.created", {
      targetTable: "agent_requests",
      targetId: data.id,
    });

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
