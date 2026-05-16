import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  display_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function metadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function formatDate(value: string | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/account");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name,metadata,created_at")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const displayName =
    profile?.display_name ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "") ||
    user.email?.split("@")[0] ||
    organization.name;

  return (
    <AppShell
      active="/settings/account"
      title="Account"
      subtitle="Manage your account."
      tabs={settingsTabs}
    >
      <section className="settings-page space-y-5">
        <section className="settings-card-pad">
          <div>
            <h2 className="text-[18px] font-bold text-[#101828]">Profile Settings</h2>
            <p className="mt-1 text-[13px] font-medium text-[#667085]">
              Manage your personal information
            </p>
          </div>

          <div className="mt-6">
            <ProfileSettingsForm
              initialValues={{
                displayName,
                email: user.email ?? "",
                phoneNumber: metadataString(profile?.metadata ?? null, "phoneNumber"),
                timezone: metadataString(profile?.metadata ?? null, "timezone") || "America/New_York",
                jobTitle: metadataString(profile?.metadata ?? null, "jobTitle"),
                department: metadataString(profile?.metadata ?? null, "department"),
              }}
            />
          </div>

          <div className="mt-6 rounded-[8px] bg-[#f8fafc] px-4 py-4">
            <h3 className="text-[13px] font-bold text-[#344054]">Account Information</h3>
            <dl className="mt-3 grid gap-2 text-[12px] sm:grid-cols-[160px_1fr]">
              <dt className="font-medium text-[#667085]">User ID</dt>
              <dd className="truncate text-right font-semibold text-[#344054] sm:text-left">
                {user.id.slice(0, 8)}...
              </dd>
              <dt className="font-medium text-[#667085]">Account Created</dt>
              <dd className="text-right font-semibold text-[#344054] sm:text-left">
                {formatDate(profile?.created_at ?? user.created_at)}
              </dd>
            </dl>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
