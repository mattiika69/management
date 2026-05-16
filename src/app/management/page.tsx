import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManagementWorkspace } from "@/components/management-workspace";
import { OperationsHeaderActions } from "@/components/operations-ui";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getManagementData } from "@/lib/operations/management";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  view?: string | string[];
  week?: string | string[];
}>;

const views = new Set([
  "checklist",
  "start-stop-keep",
  "progress",
  "management-diamond",
  "team-ratings",
]);

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ManagementPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/management");
  }

  const params = searchParams ? await searchParams : {};
  const activeView = readParam(params.view) || "checklist";
  const weekStart = readParam(params.week);
  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const data = await getManagementData(supabase, organization, user, weekStart);

  return (
    <AppShell
      active="/management"
      title="Management"
      subtitle="Management"
      headerActions={<OperationsHeaderActions />}
    >
      <ManagementWorkspace
        data={data}
        activeView={views.has(activeView) ? (activeView as Parameters<typeof ManagementWorkspace>[0]["activeView"]) : "checklist"}
      />
    </AppShell>
  );
}
