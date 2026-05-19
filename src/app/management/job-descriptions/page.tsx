import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManagementEcosystemWorkspace } from "@/components/management-ecosystem-workspace";
import { getCurrentOrganization } from "@/lib/auth/organization";
import { hiringTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type JobDescriptionRow = {
  id: string;
  title: string;
  department: string;
  reports_to: string;
  status: string;
  updated_at: string;
};

export default async function JobDescriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/management/job-descriptions");
  }

  const organization = await getCurrentOrganization(supabase, user);
  if (!organization) {
    redirect("/get-started");
  }
  const { data, error } = await supabase
    .from("management_job_descriptions")
    .select("id,title,department,reports_to,status,updated_at")
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<JobDescriptionRow[]>();

  if (error) throw new Error(error.message);

  return (
    <AppShell
      active="/management/job-descriptions"
      title="Job Descriptions"
      subtitle="Hiring"
      tabs={hiringTabs}
    >
      <ManagementEcosystemWorkspace
        title="New Job Description"
        description="Define a role before hiring and training against it."
        apiPath="/api/management/job-descriptions"
        createdKey="jobDescription"
        initialRows={(data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>}
        fields={[
          { name: "title", label: "Title", kind: "text", placeholder: "Sales Manager", required: true },
          { name: "department", label: "Department", kind: "text", placeholder: "Sales" },
          { name: "reportsTo", label: "Reports To", kind: "text", placeholder: "CEO" },
          { name: "responsibilities", label: "Responsibilities", kind: "textarea", placeholder: "Core responsibilities" },
          { name: "requirements", label: "Requirements", kind: "textarea", placeholder: "Required skills and experience" },
          { name: "scorecard", label: "Scorecard", kind: "textarea", placeholder: "How this role is measured" },
          { name: "status", label: "Status", kind: "select", options: [{ label: "Draft", value: "draft" }, { label: "Active", value: "active" }] },
        ]}
        columns={[
          { key: "title", label: "Role" },
          { key: "department", label: "Department" },
          { key: "reports_to", label: "Reports To" },
          { key: "status", label: "Status" },
        ]}
      />
    </AppShell>
  );
}
