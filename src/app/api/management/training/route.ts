import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  employeeId?: string;
  title?: string;
  ownerName?: string;
  outcomes?: string;
  cadence?: string;
  status?: string;
};

const statuses = new Set(["active", "paused", "complete", "archived"]);

function nullable(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("management_training_programs")
      .select("id,employee_id,title,owner_name,outcomes,cadence,status,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ trainingPrograms: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const title = payload.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Training title is required." }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("management_training_programs")
      .insert({
        tenant_id: context.tenant.id,
        organization_id: context.tenant.id,
        employee_id: nullable(payload.employeeId),
        title,
        owner_name: payload.ownerName?.trim() ?? "",
        outcomes: payload.outcomes?.trim() ?? "",
        cadence: payload.cadence?.trim() || "weekly",
        status: statuses.has(payload.status ?? "") ? payload.status : "active",
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id,employee_id,title,owner_name,outcomes,cadence,status,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "management.training_program.created", {
      targetTable: "management_training_programs",
      targetId: data.id,
      metadata: { title: data.title, status: data.status },
    });

    return NextResponse.json({ trainingProgram: data });
  } catch (error) {
    return jsonError(error);
  }
}
