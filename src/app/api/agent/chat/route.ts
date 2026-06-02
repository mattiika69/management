import { NextResponse } from "next/server";
import { createWebAgentContext } from "@/lib/agent/platform-context";
import { runAgent } from "@/lib/agent/runner";
import { createClient } from "@/lib/supabase/server";
import {
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";

type Payload = {
  message?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const payload = (await request.json()) as Payload;
    const message = text(payload.message);
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const agentContext = await createWebAgentContext({
      supabase: context.supabase,
      organizationId: context.tenant.id,
      organizationName: context.tenant.name,
      actorUserId: context.user.id,
      role: context.role,
    });
    const result = await runAgent({ context: agentContext, message });

    return NextResponse.json({
      response: result.text,
      status: result.status,
      toolRuns: result.toolRuns ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
