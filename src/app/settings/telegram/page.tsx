import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TelegramLinkPanel } from "@/components/telegram-link-panel";
import { TelegramUsernameForm } from "@/components/telegram-username-form";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type Connection = {
  id: string;
  display_name: string | null;
  external_channel_id: string | null;
  config: {
    telegram_username?: string;
  } | null;
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
    .select("id,display_name,external_channel_id,config")
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
        <section className="settings-card-pad">
          <div className="flex gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#f2f4f7] text-[20px] font-bold text-[#344054]">
              T
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#101828]">Telegram</h2>
              <p className="mt-2 max-w-[620px] text-[13px] font-medium leading-6 text-[#667085]">
                Connect Telegram so the AI Agent can receive approved workspace commands from connected chats.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {telegramReady ? (
              <TelegramLinkPanel compact />
            ) : (
              <span className="settings-button-outline inline-flex">Connect with an owner</span>
            )}
          </div>
        </section>

        <section className="settings-card overflow-hidden">
          <div className="settings-card-header">
            <h2 className="text-[13px] font-bold text-[#101828]">Connected chats</h2>
          </div>
          {data?.length ? (
            data.map((connection) => (
              <div
                key={connection.id}
                className="grid gap-4 border-b border-[#e4e7ec] px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate text-[13px] font-bold text-[#101828]">
                      {connection.display_name ?? connection.external_channel_id ?? "Telegram chat"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      Connected
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-medium text-[#667085]">
                    Messages from this chat can work with the AI Agent.
                  </p>
                </div>
                <TelegramUsernameForm
                  connectionId={connection.id}
                  initialUsername={connection.config?.telegram_username ?? connection.display_name}
                />
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
