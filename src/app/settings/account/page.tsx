import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/account");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);

  return (
    <AppShell
      active="/settings/account"
      title="Account"
      subtitle="Manage account access."
      tabs={settingsTabs}
    >
      <section className="settings-page">
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="settings-card-pad">
            <h2 className="text-2xl font-semibold text-[#171717]">Profile</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold text-[#34342f]">Email</dt>
                <dd className="mt-1 text-[#5d5d55]">{user.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#34342f]">Workspace</dt>
                <dd className="mt-1 text-[#5d5d55]">{organization.name}</dd>
              </div>
            </dl>
          </section>

          <section className="settings-card-pad">
            <h2 className="text-2xl font-semibold text-[#171717]">Access</h2>
            <div className="mt-5 grid gap-3">
              <a
                href="/update-password"
                className="settings-button-outline"
              >
                Update password
              </a>
              <SignOutButton className="inline-flex h-10 items-center justify-center border border-red-200 bg-white px-4 text-[13px] font-bold text-red-700 transition hover:bg-red-50" />
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
