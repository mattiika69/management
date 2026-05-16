import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HelpSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/help");
  }

  return (
    <AppShell
      active="/settings/help"
      title="Help"
      subtitle="Workspace help."
      tabs={settingsTabs}
    >
      <section className="settings-page">
        <section className="settings-card-pad">
          <h2 className="text-2xl font-semibold text-[#171717]">Help</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
            Contact your workspace owner for access, billing, or integration changes.
          </p>
        </section>
      </section>
    </AppShell>
  );
}
