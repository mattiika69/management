import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManagementEcosystemWorkspace } from "@/components/management-ecosystem-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { hiringTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type CandidateRow = {
  id: string;
  full_name: string;
  email: string | null;
  stage: string;
  rating: number | null;
};

export default async function InterviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/management/interviews");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data, error } = await supabase
    .from("management_hiring_candidates")
    .select("id,full_name,email,stage,rating")
    .eq("tenant_id", organization.id)
    .eq("stage", "interviewing")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<CandidateRow[]>();

  if (error) throw new Error(error.message);

  return (
    <AppShell
      active="/management/interviews"
      title="Interviews"
      subtitle="Hiring"
      tabs={hiringTabs}
    >
      <ManagementEcosystemWorkspace
        title="New Interview"
        description="Track interview-stage applicants and next steps."
        apiPath="/api/management/hiring"
        createdKey="candidate"
        initialRows={(data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>}
        fields={[
          { name: "fullName", label: "Applicant", kind: "text", placeholder: "Full name", required: true },
          { name: "email", label: "Email", kind: "email", placeholder: "name@example.com" },
          { name: "stage", label: "Stage", kind: "select", options: [
            { label: "Interviewing", value: "interviewing" },
            { label: "Offer", value: "offer" },
            { label: "Hired", value: "hired" },
            { label: "Rejected", value: "rejected" },
            { label: "Screening", value: "screening" },
          ] },
          { name: "rating", label: "Rating", kind: "number", placeholder: "0-10" },
          { name: "notes", label: "Notes", kind: "textarea", placeholder: "Interview notes, blockers, next steps" },
        ]}
        columns={[
          { key: "full_name", label: "Applicant" },
          { key: "email", label: "Email" },
          { key: "stage", label: "Stage" },
          { key: "rating", label: "Rating" },
        ]}
      />
    </AppShell>
  );
}
