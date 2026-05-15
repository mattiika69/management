import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

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
  const payload = (await request.json()) as Payload;
  const agentId = payload.agentId?.trim();

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { error } = await supabase.from("workspace_ai_training").upsert(
    {
      organization_id: organization.id,
      agent_id: agentId,
      overall_description: payload.overallDescription?.trim() ?? "",
      framework: payload.framework?.trim() ?? "",
      criteria: payload.criteria?.trim() ?? "",
      ai_sequence: payload.aiSequence?.trim() ?? "",
      training_refs: refs(payload.trainingRefs),
      updated_by: user.id,
    },
    { onConflict: "organization_id,agent_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
