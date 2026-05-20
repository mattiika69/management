import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  title?: string;
  department?: string;
  reportsTo?: string;
  responsibilities?: string;
  requirements?: string;
  scorecard?: string;
  status?: string;
};

const statuses = new Set(["draft", "active", "archived"]);

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("management_job_descriptions")
      .select("id,title,department,reports_to,responsibilities,requirements,scorecard,status,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ jobDescriptions: data ?? [] });
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

    const title = payload.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Job title is required." }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("management_job_descriptions")
      .insert({
        tenant_id: context.tenant.id,
        organization_id: context.tenant.id,
        title,
        department: payload.department?.trim() ?? "",
        reports_to: payload.reportsTo?.trim() ?? "",
        responsibilities: payload.responsibilities?.trim() ?? "",
        requirements: payload.requirements?.trim() ?? "",
        scorecard: payload.scorecard?.trim() ?? "",
        status: statuses.has(payload.status ?? "") ? payload.status : "draft",
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id,title,department,reports_to,responsibilities,requirements,scorecard,status,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "management.job_description.created", {
      targetTable: "management_job_descriptions",
      targetId: data.id,
      metadata: { title: data.title },
    });

    return NextResponse.json({ jobDescription: data });
  } catch (error) {
    return jsonError(error);
  }
}
