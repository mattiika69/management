import { NextResponse } from "next/server";
import { updateFunnelStep } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

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
  try {
    await params;

    const payload = (await request.json()) as Payload;
    const stepId = payload.stepId?.trim();
    const status = payload.status?.trim() ?? "not_started";

    if (!stepId || !isStatus(status)) {
      return NextResponse.json({ error: "A valid step and status are required." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
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

    const step = await updateFunnelStep(context.supabase, context.tenant, stepId, updates);

    return NextResponse.json({ ok: true, step });
  } catch (error) {
    return jsonError(error);
  }
}
