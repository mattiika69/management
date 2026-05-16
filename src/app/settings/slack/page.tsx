import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  display_name: string | null;
  external_team_id: string | null;
};

export default async function SlackSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/slack");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data, error } = await supabase
    .from("integration_connections")
    .select("id,display_name,external_team_id")
    .eq("organization_id", organization.id)
    .eq("provider", "slack")
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .returns<Connection[]>();

  if (error) throw new Error(error.message);

  const slackReady = Boolean(
    process.env.SLACK_CLIENT_ID &&
      process.env.SLACK_CLIENT_SECRET &&
      process.env.SLACK_SIGNING_SECRET,
  );

  return (
    <AppShell active="/settings/slack" title="Slack" subtitle="Manage Slack access." tabs={settingsTabs}>
      <section className="settings-page">
        <section className="settings-card-pad">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#f2f4f7] text-[20px] font-bold text-[#344054]">
                #
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#101828]">Slack</h2>
                <p className="mt-2 max-w-[620px] text-[13px] font-medium leading-6 text-[#667085]">
                  Connect Slack so learnings and workspace updates can move through team channels.
                </p>
              </div>
            </div>
            {slackReady ? (
              <a href="/api/integrations/slack/oauth/start?returnTo=/settings/slack" className="settings-button-dark">
                Connect Slack
              </a>
            ) : (
              <span className="settings-button-outline">Connect with an owner</span>
            )}
          </div>

          <section className="mt-6 overflow-hidden rounded-[9px] border border-[#d9e1ee]">
            <div className="settings-card-header">
              <h3 className="text-[13px] font-bold text-[#101828]">Workspaces</h3>
            </div>
            {data?.length ? (
              data.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between gap-4 border-t border-[#e4e7ec] px-4 py-4 first:border-t-0">
                  <span className="text-[13px] font-bold text-[#101828]">
                    {connection.display_name ?? connection.external_team_id ?? "Slack workspace"}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Connected</span>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-[13px] font-medium text-[#667085]">No Slack workspace connected yet.</p>
            )}
          </section>
        </section>
      </section>
    </AppShell>
  );
}
