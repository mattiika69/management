import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CalendarSettings, type CalendarConnectionRow } from "@/components/calendar-settings";
import { ZoomSettings, type ZoomConnectionRow } from "@/components/zoom-settings";
import { getCurrentOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { oauthProviderReady } from "@/lib/oauth/provider-oauth";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/integrations");
  }

  const organization = await getCurrentOrganization(supabase, user);
  if (!organization) {
    redirect("/get-started");
  }
  const membershipRole = await getMembershipRole(supabase, organization.id, user);
  const canManage = canManageTeam(membershipRole);
  const [calendarsResult, zoomResult] = await Promise.all([
    supabase
      .from("calendar_connections")
      .select("id,provider,display_name,account_email,sync_direction,sync_enabled,include_events,include_tasks,color,status")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .returns<CalendarConnectionRow[]>(),
    supabase
      .from("zoom_connections")
      .select("id,display_name,account_email,sync_enabled,cloud_recording_sync,default_meeting_duration_minutes,status")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .returns<ZoomConnectionRow[]>(),
  ]);

  if (calendarsResult.error) throw new Error(calendarsResult.error.message);
  if (zoomResult.error) throw new Error(zoomResult.error.message);

  return (
    <AppShell
      active="/settings/integrations"
      title="Integrations"
      subtitle="Connect the tools your team uses."
      tabs={settingsTabs}
    >
      <section className="settings-page space-y-6">
        <div className="flex flex-wrap gap-2">
          {[
            ["#calendars", "Calendars"],
            ["#zoom", "Zoom"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="sm-tab-inactive">
              {label}
            </a>
          ))}
        </div>

        <div id="calendars">
          <CalendarSettings
            initialCalendars={calendarsResult.data ?? []}
            canManage={canManage}
            googleReady={oauthProviderReady("google_calendar")}
            microsoftReady={oauthProviderReady("microsoft_calendar")}
            nylasReady={oauthProviderReady("nylas")}
          />
        </div>

        <div id="zoom">
          <ZoomSettings
            initialZoomConnections={zoomResult.data ?? []}
            canManage={canManage}
            oauthReady={oauthProviderReady("zoom")}
          />
        </div>
      </section>
    </AppShell>
  );
}
