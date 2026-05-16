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
      <section className="app-card-pad max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#101828]">Slack</h2>
            <p className="mt-2 text-[13px] leading-6 text-[#667085]">
              Connect Slack so learnings and workspace updates can move through team channels.
            </p>
          </div>
          {slackReady ? (
            <a href="/api/integrations/slack/oauth/start?returnTo=/settings/slack" className="app-button-dark">
              Connect Slack
            </a>
          ) : (
            <span className="app-button-secondary">Connect with an owner</span>
          )}
        </div>

        <div className="mt-6 divide-y divide-[#e4e7ec] overflow-hidden rounded-[8px] border border-[#e4e7ec]">
          {data?.length ? (
            data.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-[13px] font-bold text-[#101828]">
                  {connection.display_name ?? connection.external_team_id ?? "Slack workspace"}
                </span>
                <span className="text-[12px] font-semibold text-emerald-700">Connected</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-[13px] font-medium text-[#667085]">No Slack workspace connected yet.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
