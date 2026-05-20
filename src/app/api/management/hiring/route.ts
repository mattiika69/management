import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  jobDescriptionId?: string;
  fullName?: string;
  email?: string;
  stage?: string;
  rating?: number;
  notes?: string;
};

const stages = new Set(["sourced", "screening", "interviewing", "offer", "hired", "rejected"]);

function nullable(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("management_hiring_candidates")
      .select("id,job_description_id,full_name,email,stage,rating,notes,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ candidates: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const fullName = payload.fullName?.trim();
    if (!fullName) {
      return NextResponse.json({ error: "Candidate name is required." }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("management_hiring_candidates")
      .insert({
        tenant_id: context.tenant.id,
        organization_id: context.tenant.id,
        job_description_id: nullable(payload.jobDescriptionId),
        full_name: fullName,
        email: nullable(payload.email),
        stage: stages.has(payload.stage ?? "") ? payload.stage : "sourced",
        rating: typeof payload.rating === "number" ? payload.rating : null,
        notes: payload.notes?.trim() ?? "",
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id,job_description_id,full_name,email,stage,rating,notes,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "management.hiring_candidate.created", {
      targetTable: "management_hiring_candidates",
      targetId: data.id,
      metadata: { full_name: data.full_name, stage: data.stage },
    });

    return NextResponse.json({ candidate: data });
  } catch (error) {
    return jsonError(error);
  }
}
