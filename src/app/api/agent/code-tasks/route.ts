import { NextResponse } from "next/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json()) as {
      requestId?: string;
      githubRepo?: string;
      branchName?: string;
      metadata?: Record<string, unknown>;
    };
    const { data, error } = await context.supabase
      .from("agent_code_tasks")
      .insert({
        tenant_id: context.tenant.id,
        request_id: body.requestId ?? null,
        github_repo: body.githubRepo ?? "mattiika69/management",
        branch_name: body.branchName ?? null,
        metadata: body.metadata ?? {},
        created_by_user_id: context.user.id,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "agent.code_task.created", {
      targetTable: "agent_code_tasks",
      targetId: data.id,
    });

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
