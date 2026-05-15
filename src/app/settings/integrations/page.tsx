import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type IntegrationCard = {
  href: string;
  label: string;
  description: string;
  iconPath: string;
};

const integrations: IntegrationCard[] = [
  {
    href: "/settings/slack",
    label: "Slack",
    description: "Bring funnel work into your team's channels.",
    iconPath:
      "M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zM20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5zM3.5 14H5v1.5C5 16.33 4.33 17 3.5 17S2 16.33 2 15.5 2.67 14 3.5 14zM14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5zM15.5 19h1.5v1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM10 9.5C10 10.33 9.33 11 8.5 11h-5C2.67 11 2 10.33 2 9.5S2.67 8 3.5 8h5c.83 0 1.5.67 1.5 1.5zM8.5 5H7V3.5C7 2.67 7.67 2 8.5 2S10 2.67 10 3.5 9.33 5 8.5 5z",
  },
  {
    href: "/settings/telegram",
    label: "Telegram",
    description: "Get funnel updates pushed to a Telegram chat.",
    iconPath:
      "M21.5 2.5L2 10.5l6.5 2.3 2.5 7.5 3.5-4 5.5 4.1 1.5-17.9zM10 14l-.5 4 2.5-3 4.5 3.3.3-.2 1-12.6L7 13.2z",
  },
];

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/integrations");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: connections } = await supabase
    .from("integration_connections")
    .select(
      "provider,status,display_name,external_team_id,external_channel_id,created_at",
    )
    .eq("organization_id", organization.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const connectedProviders = new Set(
    (connections ?? []).map((connection) => connection.provider),
  );

  return (
    <AppShell
      active="/settings/integrations"
      title="Settings"
      subtitle="Integrations"
      tabs={settingsTabs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => {
            const isConnected = connectedProviders.has(integration.label.toLowerCase());
            return (
              <Link
                key={integration.href}
                href={integration.href}
                className="group block rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all hover:border-[color:var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-700)]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d={integration.iconPath} />
                    </svg>
                  </div>
                  {isConnected ? (
                    <Badge tone="success">Connected</Badge>
                  ) : (
                    <Badge>Not connected</Badge>
                  )}
                </div>
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                  {integration.label}
                </h3>
                <p className="mt-1 text-[13px] leading-6 text-[color:var(--color-ink-500)]">
                  {integration.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-brand-600)]">
                  Configure
                  <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader
            eyebrow="Active"
            title="Connections"
            description="All connected channels and apps for this workspace."
          />
          <CardBody>
            {connections?.length ? (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <div
                    key={`${connection.provider}-${connection.external_team_id}-${connection.external_channel_id}`}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold capitalize text-[color:var(--color-ink-900)]">
                        {connection.provider}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">
                        {connection.display_name ??
                          connection.external_channel_id ??
                          connection.external_team_id}
                      </p>
                    </div>
                    <Badge tone="success">{connection.status ?? "active"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[color:var(--color-ink-500)]">
                No active integration connections yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
