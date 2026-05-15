import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TelegramLinkPanel } from "@/components/telegram-link-panel";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TelegramSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/telegram");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: connections } = await supabase
    .from("integration_connections")
    .select("id,display_name,external_channel_id,external_user_id,created_at")
    .eq("organization_id", organization.id)
    .eq("provider", "telegram")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  const envReady = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET,
  );

  return (
    <AppShell
      active="/settings/telegram"
      title="Settings"
      subtitle="Telegram"
      tabs={settingsTabs}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {envReady ? (
          <TelegramLinkPanel />
        ) : (
          <Card>
            <CardHeader
              eyebrow="Connection"
              title="Connect Telegram"
              description="Telegram is not configured yet."
              actions={<Badge tone="warning">Not configured</Badge>}
            />
            <CardBody>
              <p className="text-[13px] text-[color:var(--color-ink-500)]">
                Set <code className="rounded bg-[color:var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[12px]">TELEGRAM_BOT_TOKEN</code> and{" "}
                <code className="rounded bg-[color:var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[12px]">TELEGRAM_WEBHOOK_SECRET</code> to enable Telegram.
              </p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader
            eyebrow="Active"
            title="Connections"
            description="Chats currently linked to this workspace."
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
                        {connection.display_name ?? "Telegram chat"}
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
                No Telegram chat connected yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
