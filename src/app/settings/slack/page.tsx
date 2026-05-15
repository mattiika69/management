import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      title="Settings"
      subtitle="Slack"
      tabs={settingsTabs}
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-surface-muted)]">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zM20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5zM3.5 14H5v1.5C5 16.33 4.33 17 3.5 17S2 16.33 2 15.5 2.67 14 3.5 14zM14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5zM15.5 19h1.5v1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM10 9.5C10 10.33 9.33 11 8.5 11h-5C2.67 11 2 10.33 2 9.5S2.67 8 3.5 8h5c.83 0 1.5.67 1.5 1.5zM8.5 5H7V3.5C7 2.67 7.67 2 8.5 2S10 2.67 10 3.5 9.33 5 8.5 5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                  Connect Slack
                </h2>
                <p className="mt-0.5 max-w-md text-[13px] text-[color:var(--color-ink-500)]">
                  Authorize the workspace to start using Slack with HyperOptimal Funnel.
                </p>
              </div>
            </div>
            {envReady ? (
              <a
                href="/api/integrations/slack/oauth/start?returnTo=/settings/slack"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[color:var(--color-ink-900)] px-5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-[color:var(--color-ink-700)]"
              >
                Connect Slack
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            ) : (
              <Badge tone="warning">Not configured</Badge>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Workspaces"
            title="Connections"
            description="Slack workspaces linked to this account."
          />
          <CardBody>
            {connections?.length ? (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                        {connection.display_name ?? "Slack workspace"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">
                        Connected {new Date(connection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge tone="success">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[color:var(--color-ink-500)]">
                No Slack workspace connected yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
