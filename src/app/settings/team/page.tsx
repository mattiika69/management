import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TeamInvitationActions } from "@/components/team-invitation-actions";
import { TeamInviteForm } from "@/components/team-invite-form";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

type SearchParams = Promise<{
  invite?: string | string[];
}>;

type Membership = {
  user_id: string;
  role: string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function loadMemberEmails(memberships: Membership[]) {
  try {
    const admin = createAdminClient();
    const entries = await Promise.all(
      memberships.map(async (membership) => {
        const { data } = await admin.auth.admin.getUserById(membership.user_id);
        return [membership.user_id, data.user?.email ?? membership.user_id] as const;
      }),
    );

    return new Map(entries);
  } catch {
    return new Map(memberships.map((membership) => [membership.user_id, membership.user_id]));
  }
}

export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/team");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const membershipRole = await getMembershipRole(supabase, organization.id, user);
  const canManage = canManageTeam(membershipRole);
  const params = searchParams ? await searchParams : {};
  const inviteStatus = readParam(params.invite);

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("user_id,role,created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true })
    .returns<Membership[]>();

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberEmails = await loadMemberEmails(memberships ?? []);

  const { data: invitations, error: invitationsError } = canManage
    ? await supabase
        .from("organization_invitations")
        .select("id,email,role,expires_at,created_at")
        .eq("organization_id", organization.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .returns<Invitation[]>()
    : { data: [] as Invitation[], error: null };

  if (invitationsError) {
    throw new Error(invitationsError.message);
  }

  return (
    <AppShell
      active="/settings/team"
      title="Team"
      subtitle={`Manage workspace settings for ${organization.name}.`}
      tabs={settingsTabs}
    >
      <section className="mx-auto max-w-6xl">
        {inviteStatus === "accepted" ? (
          <div className="mt-6 border border-[#b7d7cf] bg-[#eef7f5] px-5 py-4 text-sm text-[#0f766e]">
            Invitation accepted. You now have access to this workspace.
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="border border-[#d9d7cb] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#171717]">Team</h2>
                <p className="mt-2 text-sm text-[#5d5d55]">
                  Manage who can access this workspace.
                </p>
              </div>
              <span className="border border-[#d9d7cb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5d5d55]">
                Your role: {membershipRole}
              </span>
            </div>

            <div className="mt-6 overflow-hidden border border-[#ebe3d8]">
              <div className="hidden grid-cols-[1fr_140px_140px] gap-3 bg-[#f8f4ee] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7f73] md:grid">
                <span>Email</span>
                <span>Role</span>
                <span>Joined</span>
              </div>
              {(memberships ?? []).map((membership) => (
                <div
                  key={membership.user_id}
                  className="grid gap-2 border-t border-[#ebe3d8] px-4 py-4 text-sm md:grid-cols-[1fr_140px_140px] md:gap-3"
                >
                  <span className="min-w-0 truncate text-[#171717]">
                    {memberEmails.get(membership.user_id)}
                  </span>
                  <span className="capitalize text-[#5d5d55]">
                    <span className="md:hidden">Role: </span>
                    {membership.role}
                  </span>
                  <span className="text-[#5d5d55]">
                    <span className="md:hidden">Joined: </span>
                    {formatDate(membership.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {canManage ? (
            <TeamInviteForm />
          ) : (
            <section className="border border-[#d9d7cb] bg-white p-6">
              <h2 className="text-2xl font-semibold text-[#171717]">Invite member</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
                Ask a workspace owner or admin to invite new team members.
              </p>
            </section>
          )}
        </div>

        {canManage ? (
          <section className="mt-6 border border-[#d9d7cb] bg-white p-6">
            <h2 className="text-2xl font-semibold text-[#171717]">Pending invites</h2>
            <div className="mt-5 space-y-3">
              {(invitations ?? []).length ? (
                invitations?.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-4 border border-[#ebe3d8] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#171717]">{invitation.email}</p>
                      <p className="mt-1 text-[#5d5d55]">
                        {invitation.role} invite expires {formatDate(invitation.expires_at)}
                      </p>
                    </div>
                    <TeamInvitationActions invitationId={invitation.id} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#5d5d55]">No pending invitations.</p>
              )}
            </div>
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}
