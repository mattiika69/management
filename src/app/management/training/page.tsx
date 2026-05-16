import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManagementEcosystemWorkspace } from "@/components/management-ecosystem-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

type TrainingProgramRow = {
  id: string;
  title: string;
  owner_name: string;
  cadence: string;
  status: string;
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
  const { data, error } = await supabase
    .from("management_training_programs")
    .select("id,title,owner_name,cadence,status")
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<TrainingProgramRow[]>();

  if (error) throw new Error(error.message);

  return (
    <AppShell active="/management/training" title="Training" subtitle="Training plans that support hiring, meetings, and role success.">
      <ManagementEcosystemWorkspace
        title="New Training Plan"
        description="Create training programs for employees and roles."
        apiPath="/api/management/training"
        createdKey="trainingProgram"
        initialRows={(data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>}
        fields={[
          { name: "title", label: "Training", kind: "text", placeholder: "Onboarding Week 1", required: true },
          { name: "ownerName", label: "Owner", kind: "text", placeholder: "Manager name" },
          { name: "outcomes", label: "Outcomes", kind: "textarea", placeholder: "What should be true when training is complete" },
          { name: "cadence", label: "Cadence", kind: "select", options: [{ label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }] },
          { name: "status", label: "Status", kind: "select", options: [{ label: "Active", value: "active" }, { label: "Paused", value: "paused" }, { label: "Complete", value: "complete" }] },
        ]}
        columns={[
          { key: "title", label: "Training" },
          { key: "owner_name", label: "Owner" },
          { key: "cadence", label: "Cadence" },
          { key: "status", label: "Status" },
        ]}
      />
    </AppShell>
  );
}
