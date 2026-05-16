import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SlackSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/slack");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: connections } = await supabase
    .from("integration_connections")
    .select("id,display_name,external_team_id,bot_user_id,created_at")
    .eq("organization_id", organization.id)
    .eq("provider", "slack")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  const envReady = Boolean(
    process.env.SLACK_CLIENT_ID &&
      process.env.SLACK_CLIENT_SECRET &&
      process.env.SLACK_SIGNING_SECRET,
  );

  return (
    <AppShell
      active="/settings/slack"
      title="Slack"
      subtitle="Connect Slack to work with updates from your workspace."
      tabs={settingsTabs}
    >
      <section className="mx-auto max-w-6xl">
        <section className="mt-6 rounded-lg border border-[#d9d7cb] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2d2620]">Connect Slack</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
                Authorize the workspace to start using Slack with HyperOptimal Management.
              </p>
            </div>
            {envReady ? (
              <a href="/api/integrations/slack/oauth/start?returnTo=/settings/slack" className="rounded-md bg-[#e85b3c] px-4 py-2 text-sm font-semibold text-white">
                Connect Slack
              </a>
            ) : (
              <span className="rounded-md border border-[#eadfd3] px-4 py-2 text-sm text-[#8a5a2d]">
                Slack is not available yet
              </span>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#d9d7cb] bg-white p-6">
          <h2 className="font-serif text-2xl font-bold text-[#2d2620]">Connections</h2>
          <div className="mt-4 space-y-3 text-sm">
            {connections?.length ? (
              connections.map((connection) => (
                <div key={connection.id} className="rounded-md border border-[#ebe3d8] p-4">
                  <p className="font-semibold text-[#171717]">{connection.display_name ?? "Slack workspace"}</p>
                  <p className="mt-1 text-[#5d5d55]">
                    Connected {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[#5d5d55]">No Slack workspace connected yet.</p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
