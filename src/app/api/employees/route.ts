import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

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

function nullable(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function employeeInsert(payload: EmployeePayload, tenantId: string, userId: string) {
  const fullName = payload.fullName?.trim();
  if (!fullName) {
    return { error: "Employee name is required." };
  }

  const employmentStatus = statuses.has(payload.employmentStatus ?? "")
    ? payload.employmentStatus
    : "active";

  return {
    data: {
      tenant_id: tenantId,
      organization_id: tenantId,
      full_name: fullName,
      email: nullable(payload.email),
      role_title: payload.roleTitle?.trim() ?? "",
      department: payload.department?.trim() ?? "",
      employment_status: employmentStatus,
      calendar_email: nullable(payload.calendarEmail),
      timezone: payload.timezone?.trim() || "America/New_York",
      start_date: nullable(payload.startDate),
      created_by_user_id: userId,
      updated_by_user_id: userId,
    },
  };
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("employees")
      .select("id,full_name,email,role_title,department,employment_status,calendar_email,timezone,start_date,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ employees: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EmployeePayload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = employeeInsert(payload, context.tenant.id, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("employees")
      .insert(prepared.data)
      .select("id,full_name,email,role_title,department,employment_status,calendar_email,timezone,start_date,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "employee.created", {
      targetTable: "employees",
      targetId: data.id,
      metadata: { email: data.email, full_name: data.full_name },
    });

    return NextResponse.json({ employee: data });
  } catch (error) {
    return jsonError(error);
  }
}
