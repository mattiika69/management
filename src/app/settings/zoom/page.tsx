import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ZoomSettings, type ZoomConnectionRow } from "@/components/zoom-settings";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { oauthProviderReady } from "@/lib/oauth/provider-oauth";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

export default async function ZoomSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/zoom");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const membershipRole = await getMembershipRole(supabase, organization.id, user);
  const { data, error } = await supabase
    .from("zoom_connections")
    .select("id,display_name,account_email,sync_enabled,cloud_recording_sync,default_meeting_duration_minutes,status")
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<ZoomConnectionRow[]>();

  if (error) throw new Error(error.message);

  return (
    <AppShell active="/settings/zoom" title="Zoom" subtitle="Manage Zoom accounts." tabs={settingsTabs}>
      <ZoomSettings
        initialZoomConnections={data ?? []}
        canManage={canManageTeam(membershipRole)}
        oauthReady={oauthProviderReady("zoom")}
      />
    </AppShell>
  );
}
