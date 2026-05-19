import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  agentId?: string;
  overallDescription?: string;
  framework?: string;
  criteria?: string;
  aiSequence?: string;
  trainingRefs?: unknown;
};

function refs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;
      const url = typeof raw.url === "string" ? raw.url.trim() : "";
      const label = typeof raw.label === "string" ? raw.label.trim() : "";
      return url ? { url, label } : null;
    })
    .filter(Boolean);
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const agentId = payload.agentId?.trim();

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
    const { error } = await context.supabase.from("workspace_ai_training").upsert(
      {
        organization_id: context.tenant.id,
        agent_id: agentId,
        overall_description: payload.overallDescription?.trim() ?? "",
        framework: payload.framework?.trim() ?? "",
        criteria: payload.criteria?.trim() ?? "",
        ai_sequence: payload.aiSequence?.trim() ?? "",
        training_refs: refs(payload.trainingRefs),
        updated_by: context.user.id,
      },
      { onConflict: "organization_id,agent_id" },
    );

    if (error) {
      return NextResponse.json(
        { error: "AI Agent settings could not be saved." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
