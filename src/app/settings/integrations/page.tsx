import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { CalendarSettings, type CalendarConnectionRow } from "@/components/calendar-settings";
import { TelegramLinkPanel } from "@/components/telegram-link-panel";
import { ZoomSettings, type ZoomConnectionRow } from "@/components/zoom-settings";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

type IntegrationConnection = {
  id: string;
  provider: string;
  display_name: string | null;
  external_team_id: string | null;
  external_channel_id: string | null;
  created_at: string;
};

function ConnectCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="settings-card-pad">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-gray-950">{title}</h2>
          <p className="mt-2 text-[13px] leading-6 text-gray-600">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/integrations");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const membershipRole = await getMembershipRole(supabase, organization.id, user);
  const canManage = canManageTeam(membershipRole);
  const [calendarsResult, zoomResult, connectionsResult] = await Promise.all([
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
    supabase
      .from("integration_connections")
      .select("id,provider,status,display_name,external_team_id,external_channel_id,created_at")
      .eq("organization_id", organization.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .returns<IntegrationConnection[]>(),
  ]);

  if (calendarsResult.error) throw new Error(calendarsResult.error.message);
  if (zoomResult.error) throw new Error(zoomResult.error.message);
  if (connectionsResult.error) throw new Error(connectionsResult.error.message);

  const slackReady = Boolean(
    process.env.SLACK_CLIENT_ID &&
      process.env.SLACK_CLIENT_SECRET &&
      process.env.SLACK_SIGNING_SECRET,
  );
  const telegramReady = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);

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
            ["#slack", "Slack"],
            ["#telegram", "Telegram"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="sm-tab-inactive">
              {label}
            </a>
          ))}
        </div>

        <div id="calendars">
          <CalendarSettings initialCalendars={calendarsResult.data ?? []} canManage={canManage} />
        </div>

        <div id="zoom">
          <ZoomSettings initialZoomConnections={zoomResult.data ?? []} canManage={canManage} />
        </div>

        <ConnectCard
          id="slack"
          title="Slack"
          description="Connect Slack so the AI Agent can receive approved workspace commands from team channels."
        >
          {slackReady ? (
            <a href="/api/integrations/slack/oauth/start?returnTo=/settings/integrations" className="settings-button-dark">
              Connect Slack
            </a>
          ) : (
            <span className="settings-button-outline">
              Connect with an owner
            </span>
          )}
        </ConnectCard>

        <div id="telegram">
          {telegramReady ? (
            <TelegramLinkPanel />
          ) : (
            <ConnectCard
              id="telegram-connect"
              title="Telegram"
              description="Connect Telegram so the AI Agent can receive approved workspace commands from connected chats."
            >
              <span className="settings-button-outline">
                Connect with an owner
              </span>
            </ConnectCard>
          )}
        </div>

        <section className="settings-card-pad">
          <h2 className="text-[15px] font-bold text-gray-950">Connections</h2>
          <div className="mt-4 space-y-2 text-[13px]">
            {connectionsResult.data?.length ? (
              connectionsResult.data.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between border border-[#ebe3d8] px-3 py-2">
                  <span className="font-semibold capitalize text-gray-950">{connection.provider}</span>
                  <span className="text-gray-600">{connection.display_name ?? connection.external_channel_id ?? connection.external_team_id}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No connections yet.</p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
