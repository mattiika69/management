import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

type EmployeePayload = {
  fullName?: string;
  email?: string;
  roleTitle?: string;
  department?: string;
  employmentStatus?: string;
  calendarEmail?: string;
  timezone?: string;
  startDate?: string;
};

const statuses = new Set(["active", "onboarding", "contractor", "inactive"]);

function optionalText(value: unknown) {
  if (value === undefined) return undefined;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function employeePatch(payload: EmployeePayload, userId: string) {
  const patch: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.fullName !== undefined) {
    const fullName = payload.fullName.trim();
    if (!fullName) return { error: "Employee name is required." };
    patch.full_name = fullName;
  }
  if (payload.email !== undefined) patch.email = optionalText(payload.email);
  if (payload.roleTitle !== undefined) patch.role_title = payload.roleTitle.trim();
  if (payload.department !== undefined) patch.department = payload.department.trim();
  if (payload.employmentStatus !== undefined && statuses.has(payload.employmentStatus)) {
    patch.employment_status = payload.employmentStatus;
  }
  if (payload.calendarEmail !== undefined) patch.calendar_email = optionalText(payload.calendarEmail);
  if (payload.timezone !== undefined) patch.timezone = payload.timezone.trim() || "America/New_York";
  if (payload.startDate !== undefined) patch.start_date = optionalText(payload.startDate);

  return { data: patch };
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as EmployeePayload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = employeePatch(payload, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("employees")
      .update(prepared.data)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .select("id,full_name,email,role_title,department,employment_status,calendar_email,timezone,start_date,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "employee.updated", {
      targetTable: "employees",
      targetId: id,
    });

    return NextResponse.json({ employee: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const { error } = await context.supabase
      .from("employees")
      .update({ archived_at: new Date().toISOString(), updated_by_user_id: context.user.id })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);

    await auditAction(context, "employee.archived", {
      targetTable: "employees",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
