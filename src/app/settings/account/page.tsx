import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

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
      title="Settings"
      subtitle="Account"
      tabs={settingsTabs}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader
            eyebrow="Profile"
            title="Account details"
            description="Information tied to this workspace account."
          />
          <CardBody>
            <dl className="grid gap-5 text-[14px]">
              <div className="grid gap-1">
                <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">
                  Email
                </dt>
                <dd className="text-[color:var(--color-ink-900)]">{user.email}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">
                  Workspace
                </dt>
                <dd className="text-[color:var(--color-ink-900)]">{organization.name}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">
                  User ID
                </dt>
                <dd className="font-mono text-[12px] text-[color:var(--color-ink-500)]">
                  {user.id}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Access"
            title="Security"
            description="Manage how you sign in."
          />
          <CardBody>
            <div className="flex flex-col gap-2.5">
              <a
                href="/update-password"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-[13px] font-medium text-[color:var(--color-ink-900)] transition-colors hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-muted)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Update password
              </a>
              <SignOutButton className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-100" />
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
