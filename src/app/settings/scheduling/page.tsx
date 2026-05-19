import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ScheduleManager } from "@/components/schedule-manager";
import { getCurrentOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

export default async function SchedulingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/scheduling");
  }

  const organization = await getCurrentOrganization(supabase, user);
  if (!organization) {
    redirect("/get-started");
  }
  const role = await getMembershipRole(supabase, organization.id, user);

  if (!canManageTeam(role)) {
    redirect("/settings/team");
  }

  const { data: schedules } = await supabase
    .from("integration_workflow_schedules")
    .select("id,name,workflow_key,cadence,timezone,enabled")
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <AppShell
      active="/settings/scheduling"
      title="Scheduling"
      subtitle="Manage recurring workspace workflows."
      tabs={settingsTabs}
    >
      <section className="settings-page">
        <ScheduleManager initialSchedules={schedules ?? []} />
      </section>
    </AppShell>
  );
}
