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
      <section className="mx-auto max-w-6xl">
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="border border-[#d9d7cb] bg-white p-6">
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

          <section className="border border-[#d9d7cb] bg-white p-6">
            <h2 className="text-2xl font-semibold text-[#171717]">Access</h2>
            <div className="mt-5 grid gap-3">
              <a
                href="/update-password"
                className="border border-[#0f766e] px-4 py-3 text-center text-sm font-semibold text-[#0f766e]"
              >
                Update password
              </a>
              <SignOutButton className="border border-red-200 px-4 py-3 text-sm font-semibold text-red-700" />
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
