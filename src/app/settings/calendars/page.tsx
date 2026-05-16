import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CalendarSettings, type CalendarConnectionRow } from "@/components/calendar-settings";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

export default async function CalendarSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/calendars");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const membershipRole = await getMembershipRole(supabase, organization.id, user);
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id,provider,display_name,account_email,sync_direction,sync_enabled,include_events,include_tasks,color,status")
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<CalendarConnectionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell
      active="/settings/calendars"
      title="Calendars"
      subtitle="Sync the calendars used for meetings, hiring, and management work."
      tabs={settingsTabs}
    >
      <CalendarSettings initialCalendars={data ?? []} canManage={canManageTeam(membershipRole)} />
    </AppShell>
  );
}
