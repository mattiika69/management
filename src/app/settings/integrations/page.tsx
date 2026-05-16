import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("provider,status,display_name,external_team_id,external_channel_id,created_at")
    .eq("organization_id", organization.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (
    <AppShell
      active="/settings/integrations"
      title="Integrations"
      subtitle="Connect the channels your team uses."
      tabs={settingsTabs}
    >
      <section className="mx-auto max-w-6xl">
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Link href="/settings/calendars" className="rounded-lg border border-[#d9d7cb] bg-white p-6 hover:border-[#2563eb]">
            <h2 className="text-2xl font-bold text-[#111827]">Calendars</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d5d55]">Sync multiple calendars for meetings, hiring, and employee workflows.</p>
          </Link>
          <Link href="/settings/zoom" className="rounded-lg border border-[#d9d7cb] bg-white p-6 hover:border-[#2563eb]">
            <h2 className="text-2xl font-bold text-[#111827]">Zoom</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d5d55]">Connect Zoom accounts for management meetings and recordings.</p>
          </Link>
          <Link href="/settings/slack" className="rounded-lg border border-[#d9d7cb] bg-white p-6 hover:border-[#e85b3c]">
            <h2 className="text-2xl font-bold text-[#111827]">Slack</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d5d55]">Connect Slack so your team can work from channel messages.</p>
          </Link>
          <Link href="/settings/telegram" className="rounded-lg border border-[#d9d7cb] bg-white p-6 hover:border-[#e85b3c]">
            <h2 className="text-2xl font-bold text-[#111827]">Telegram</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d5d55]">Connect Telegram to send and receive workspace updates.</p>
          </Link>
        </div>

        <section className="mt-6 rounded-lg border border-[#d9d7cb] bg-white p-6">
          <h2 className="text-2xl font-bold text-[#111827]">Active Connections</h2>
          <div className="mt-4 space-y-3 text-sm">
            {connections?.length ? (
              connections.map((connection) => (
                <div key={`${connection.provider}-${connection.external_team_id}-${connection.external_channel_id}`} className="rounded-md border border-[#ebe3d8] p-4">
                  <p className="font-semibold capitalize text-[#171717]">{connection.provider}</p>
                  <p className="mt-1 text-[#5d5d55]">{connection.display_name ?? connection.external_channel_id ?? connection.external_team_id}</p>
                </div>
              ))
            ) : (
              <p className="text-[#5d5d55]">No active integration connections yet.</p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
