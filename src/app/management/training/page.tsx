import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  TrainingScreeningWorkspace,
  type TrainingItem,
  type TrainingPerson,
  type TrainingProgram,
} from "@/components/training-screening-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { managementTabs } from "@/lib/hyperoptimal/navigation";
import { initialsFor, listWorkspacePeople } from "@/lib/operations/people";
import { createClient } from "@/lib/supabase/server";

type TrainingProgramRow = TrainingProgram;

type TrainingItemRow = TrainingItem;

type EmployeeRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  role_title: string;
};

export default async function ManagementTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/management/training");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const [programsResult, itemsResult, employeesResult] = await Promise.all([
    supabase
      .from("management_training_programs")
      .select("id,employee_id,title,owner_name,outcomes,cadence,status")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .returns<TrainingProgramRow[]>(),
    supabase
      .from("management_training_items")
      .select("id,program_id,day_number,item_order,item_type,title,estimated_minutes,resource_url,details,sop_reference,status,created_at,updated_at")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .order("day_number", { ascending: true })
      .order("item_order", { ascending: true })
      .returns<TrainingItemRow[]>(),
    supabase
      .from("employees")
      .select("id,user_id,full_name,role_title")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .neq("employment_status", "inactive")
      .order("full_name", { ascending: true })
      .returns<EmployeeRow[]>(),
  ]);

  if (programsResult.error) throw new Error(programsResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const workspacePeople = await listWorkspacePeople(supabase, organization.id, user);
  const people: TrainingPerson[] = employeesResult.data?.length
    ? employeesResult.data.map((employee) => ({
        key: employee.id,
        employeeId: employee.id,
        name: employee.full_name,
        role: employee.role_title || "Team Member",
        initials: initialsFor(employee.full_name),
      }))
    : workspacePeople.map((person) => ({
        key: person.key,
        employeeId: null,
        name: person.name,
        role: person.role,
        initials: person.initials,
      }));

  return (
    <AppShell
      active="/management/training"
      title="Training"
      subtitle="Training plans that support hiring, meetings, and role success."
      tabs={managementTabs}
    >
      <TrainingScreeningWorkspace
        initialPrograms={programsResult.data ?? []}
        initialItems={itemsResult.data ?? []}
        people={people}
      />
    </AppShell>
  );
}
