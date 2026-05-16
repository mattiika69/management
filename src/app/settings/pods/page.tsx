import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PodsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/pods");
  }

  await getOrCreateDefaultOrganization(supabase, user);

  return (
    <AppShell active="/settings/pods" title="Pods" subtitle="Manage pods." tabs={settingsTabs}>
      <section className="max-w-[1064px]">
        <div className="mb-6 border-b border-[#101828] pb-3">
          <h2 className="text-lg font-bold text-[#101828]">Pods</h2>
        </div>
        <section className="app-card-pad">
          <h3 className="text-[13px] font-bold text-[#101828]">Team Pods</h3>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#667085]">
            Create team pods to group calendars, meetings, and management work.
          </p>
        </section>
      </section>
    </AppShell>
  );
}
