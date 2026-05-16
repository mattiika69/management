import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MeetingsWorkspace } from "@/components/meetings-workspace";
import { OperationsHeaderActions } from "@/components/operations-ui";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getMeetingsData } from "@/lib/operations/meetings";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ view?: string | string[] }>;

const views = new Set(["team", "training", "one_on_one", "client", "planning"]);

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/meetings");
  }

  const params = searchParams ? await searchParams : {};
  const activeView = readParam(params.view) || "team";
  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const data = await getMeetingsData(supabase, organization, user);

  return (
    <AppShell
      active="/meetings"
      title="Meetings"
      subtitle="Meetings"
      headerActions={<OperationsHeaderActions />}
    >
      <MeetingsWorkspace
        data={data}
        activeView={views.has(activeView) ? (activeView as Parameters<typeof MeetingsWorkspace>[0]["activeView"]) : "team"}
      />
    </AppShell>
  );
}
