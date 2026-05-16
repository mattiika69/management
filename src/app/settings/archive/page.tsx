import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ArchiveSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/archive");
  }

  await getOrCreateDefaultOrganization(supabase, user);

  return (
    <AppShell active="/settings/archive" title="Archive" subtitle="Manage archived records." tabs={settingsTabs}>
      <section className="settings-page">
        <div className="settings-title-rule">
          <h2 className="text-lg font-bold text-[#101828]">Archive</h2>
        </div>
        <section className="settings-card-pad">
          <h3 className="text-[13px] font-bold text-[#101828]">Archived Items</h3>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#667085]">
            Archived team records and workspace items will appear here.
          </p>
        </section>
      </section>
    </AppShell>
  );
}
