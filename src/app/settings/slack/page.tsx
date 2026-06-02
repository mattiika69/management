import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  display_name: string | null;
  external_team_id: string | null;
};

const slackSetupSteps = [
  {
    title: "Connect the workspace",
    body: "Use OAuth from this page so HyperOptimal Management can receive Slack mentions, DMs, and thread replies.",
  },
  {
    title: "Invite the bot to private channels",
    body: "In Slack, open the private channel and invite the HyperOptimal Management app before using it there.",
  },
  {
    title: "Talk to the agent",
    body: "Mention the agent in a channel or thread. Slack will only let the app edit or delete messages it posted.",
  },
];

export default async function SlackSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/slack");
  }

  const organization = await getCurrentOrganization(supabase, user);
  if (!organization) {
    redirect("/get-started");
  }
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
                  Connect Slack so the workspace assistant can help in public channels, private channels where it has been invited,
                  direct messages, mentions, and threads.
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

          <div className="mt-6 grid gap-5 border-t border-[#e4e7ec] pt-5 md:grid-cols-3">
            {slackSetupSteps.map((step, index) => (
              <div key={step.title}>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#101828] text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="text-[13px] font-bold text-[#101828]">{step.title}</h3>
                </div>
                <p className="mt-2 text-[12px] font-medium leading-5 text-[#667085]">{step.body}</p>
              </div>
            ))}
          </div>

          <section className="mt-6 overflow-hidden rounded-[9px] border border-[#d9e1ee]">
            <div className="settings-card-header">
              <h3 className="text-[13px] font-bold text-[#101828]">Connected workspaces</h3>
            </div>
            {data?.length ? (
              data.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between gap-4 border-t border-[#e4e7ec] px-4 py-4 first:border-t-0">
                  <span className="text-[13px] font-bold text-[#101828]">
                    {connection.display_name ?? connection.external_team_id ?? "Slack workspace"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {connection.external_team_id ? (
                      <span className="font-mono text-[11px] font-semibold text-[#667085]">{connection.external_team_id}</span>
                    ) : null}
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Connected</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8">
                <p className="text-[13px] font-bold text-[#101828]">No Slack workspace connected yet.</p>
                <p className="mt-2 max-w-[620px] text-[13px] font-medium leading-6 text-[#667085]">
                  Connect Slack, then invite the app to any private channel where the team should use the workspace assistant.
                </p>
              </div>
            )}
          </section>
        </section>
      </section>
    </AppShell>
  );
}
