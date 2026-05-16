import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { getCreditAccount } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

export default async function UsageSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/usage");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const creditAccount = await getCreditAccount(supabase, organization).catch(() => null);

  return (
    <AppShell active="/settings/usage" title="Usage" subtitle="Review workspace usage." tabs={settingsTabs}>
      <section className="settings-page">
        <div className="settings-title-rule">
          <h2 className="text-lg font-bold text-[#101828]">Usage</h2>
        </div>
        <section className="settings-card-pad">
          <h3 className="text-[13px] font-bold text-[#101828]">Workspace Credits</h3>
          <p className="mt-2 text-[24px] font-bold text-[#101828]">{creditAccount?.balance_credits ?? 0}</p>
          <p className="mt-1 text-[13px] font-medium text-[#667085]">Credits available</p>
        </section>
      </section>
    </AppShell>
  );
}
