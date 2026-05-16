import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TelegramLinkPanel } from "@/components/telegram-link-panel";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const envReady = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);

  return (
    <AppShell
      active="/settings/telegram"
      title="Telegram"
      subtitle="Connect Telegram to work with updates from your workspace."
      tabs={settingsTabs}
    >
      <section className="mx-auto max-w-6xl">
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          {envReady ? (
            <TelegramLinkPanel />
          ) : (
            <section className="rounded-lg border border-[#eadfd3] bg-white p-6">
              <h2 className="font-serif text-2xl font-bold text-[#2d2620]">Connect Telegram</h2>
              <p className="mt-2 text-sm leading-6 text-[#8a5a2d]">
                Telegram is not available yet.
              </p>
            </section>
          )}

          <section className="rounded-lg border border-[#d9d7cb] bg-white p-6">
            <h2 className="font-serif text-2xl font-bold text-[#2d2620]">Connections</h2>
            <div className="mt-4 space-y-3 text-sm">
              {connections?.length ? (
                connections.map((connection) => (
                  <div key={connection.id} className="rounded-md border border-[#ebe3d8] p-4">
                    <p className="font-semibold text-[#171717]">{connection.display_name ?? "Telegram chat"}</p>
                    <p className="mt-1 text-[#5d5d55]">
                      Connected {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[#5d5d55]">No Telegram chat connected yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
