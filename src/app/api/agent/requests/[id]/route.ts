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

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { data, error } = await context.supabase
      .from("agent_requests")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ request: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const body = (await request.json()) as {
      requestText?: string;
      riskLevel?: "low" | "normal" | "high";
    };
    const requestText = body.requestText?.trim();
    const riskLevel = body.riskLevel ?? "normal";

    if (!requestText) {
      return NextResponse.json({ error: "Request text is required." }, { status: 400 });
    }

    if (!["low", "normal", "high"].includes(riskLevel)) {
      return NextResponse.json({ error: "Risk level is invalid." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await context.supabase
      .from("agent_requests")
      .select("id,status,metadata")
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .single<{ id: string; status: string; metadata: Record<string, unknown> | null }>();

    if (existingError) throw new Error(existingError.message);

    if (!["pending", "approved"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Requests with status ${existing.status} cannot be edited.` },
        { status: 409 },
      );
    }

    const { data, error } = await context.supabase
      .from("agent_requests")
      .update({
        request_text: requestText,
        risk_level: riskLevel,
        status: existing.status === "approved" ? "pending" : existing.status,
        metadata: {
          ...(existing.metadata ?? {}),
          lastEditedFrom: "web",
          lastEditedByUserId: context.user.id,
          lastEditedAt: new Date().toISOString(),
        },
      })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "agent.request.edited", {
      targetTable: "agent_requests",
      targetId: id,
      metadata: { riskLevel },
    });

    return NextResponse.json({ request: data });
  } catch (error) {
    return jsonError(error);
  }
}
