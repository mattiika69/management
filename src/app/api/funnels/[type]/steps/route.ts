import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { updateFunnelStep } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ type: string }>;
};

type Payload = {
  stepId?: string;
  status?: string;
  url?: string;
  notes?: string;
  assignedTo?: string;
  techStackName?: string;
  techStackUrl?: string;
  exampleUrl?: string;
};

function isStatus(value: string): value is "not_started" | "in_progress" | "done" {
  return value === "not_started" || value === "in_progress" || value === "done";
}

export async function PUT(request: Request, { params }: RouteContext) {
  await params;

  const payload = (await request.json()) as Payload;
  const stepId = payload.stepId?.trim();
  const status = payload.status?.trim() ?? "not_started";

  if (!stepId || !isStatus(status)) {
    return NextResponse.json({ error: "A valid step and status are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const updates = {
    status,
    url: payload.url?.trim() ?? "",
    assigned_to: payload.assignedTo?.trim() ?? "",
    ...("notes" in payload ? { notes: payload.notes?.trim() ?? "" } : {}),
    metadata: {
      techStackName: payload.techStackName?.trim() ?? "",
      techStackUrl: payload.techStackUrl?.trim() ?? "",
      exampleUrl: payload.exampleUrl?.trim() ?? "",
    },
  };

  const step = await updateFunnelStep(supabase, organization, stepId, updates);

  return NextResponse.json({ ok: true, step });
}
