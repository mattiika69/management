import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TelegramLinkPanel } from "@/components/telegram-link-panel";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  display_name: string | null;
  external_channel_id: string | null;
};

export default async function TelegramSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/telegram");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data, error } = await supabase
    .from("integration_connections")
    .select("id,display_name,external_channel_id")
    .eq("organization_id", organization.id)
    .eq("provider", "telegram")
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .returns<Connection[]>();

  if (error) throw new Error(error.message);

  const telegramReady = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);

  return (
    <AppShell active="/settings/telegram" title="Telegram" subtitle="Manage Telegram access." tabs={settingsTabs}>
      <section className="settings-page space-y-5">
        {telegramReady ? (
          <TelegramLinkPanel />
        ) : (
          <section className="settings-card-pad">
            <h2 className="text-[17px] font-bold text-[#101828]">Telegram</h2>
            <p className="mt-2 text-[13px] leading-6 text-[#667085]">
              Connect Telegram so workspace updates can be sent and received from approved chats.
            </p>
            <span className="settings-button-outline mt-5 inline-flex">Connect with an owner</span>
          </section>
        )}

        <section className="settings-card overflow-hidden">
          <div className="settings-card-header">
            <h2 className="text-[13px] font-bold text-[#101828]">Connected Chats</h2>
          </div>
          {data?.length ? (
            data.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between gap-4 border-b border-[#edf0f5] px-4 py-3 last:border-b-0">
                <span className="text-[13px] font-bold text-[#101828]">
                  {connection.display_name ?? connection.external_channel_id ?? "Telegram chat"}
                </span>
                <span className="text-[12px] font-semibold text-emerald-700">Connected</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-[13px] font-medium text-[#667085]">No Telegram chats connected yet.</p>
          )}
        </section>
      </section>
    </AppShell>
  );
}
