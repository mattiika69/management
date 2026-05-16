import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployeesSettings, type EmployeeRow } from "@/components/employees-settings";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

export default async function EmployeesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/employees");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const membershipRole = await getMembershipRole(supabase, organization.id, user);
  const { data, error } = await supabase
    .from("employees")
    .select("id,full_name,email,role_title,department,employment_status,calendar_email,timezone")
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("full_name", { ascending: true })
    .returns<EmployeeRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell
      active="/settings/employees"
      title="Employees"
      subtitle="Add and manage the people used across Management."
      tabs={settingsTabs}
    >
      <EmployeesSettings initialEmployees={data ?? []} canManage={canManageTeam(membershipRole)} />
    </AppShell>
  );
}
