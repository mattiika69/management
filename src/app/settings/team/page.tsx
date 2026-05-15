import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TeamInvitationActions } from "@/components/team-invitation-actions";
import { TeamInviteForm } from "@/components/team-invite-form";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        return [
          membership.user_id,
          data.user?.email ?? membership.user_id,
        ] as const;
      }),
    );

    return new Map(entries);
  } catch {
    return new Map(
      memberships.map((membership) => [membership.user_id, membership.user_id]),
    );
  }
}

function initials(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
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
      title="Settings"
      subtitle={`Team · ${organization.name}`}
      tabs={settingsTabs}
    >
      <div className="space-y-6">
        {inviteStatus === "accepted" ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Invitation accepted. You now have access to this workspace.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader
              eyebrow="Workspace members"
              title={`${memberships?.length ?? 0} ${memberships?.length === 1 ? "member" : "members"}`}
              description="Manage who has access to this workspace."
              actions={
                <Badge tone="brand">Your role: {membershipRole}</Badge>
              }
            />
            <div className="divide-y divide-[color:var(--color-border)]">
              <div className="hidden grid-cols-[1fr_140px_140px] gap-3 bg-[color:var(--color-surface-muted)] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)] md:grid">
                <span>Member</span>
                <span>Role</span>
                <span>Joined</span>
              </div>
              {(memberships ?? []).map((membership) => {
                const email = memberEmails.get(membership.user_id) ?? membership.user_id;
                return (
                  <div
                    key={membership.user_id}
                    className="grid gap-2 px-5 py-4 text-[13px] md:grid-cols-[1fr_140px_140px] md:gap-3 md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[11px] font-semibold text-[color:var(--color-brand-700)]">
                        {initials(email)}
                      </div>
                      <span className="min-w-0 truncate font-medium text-[color:var(--color-ink-900)]">
                        {email}
                      </span>
                    </div>
                    <span className="capitalize text-[color:var(--color-ink-500)]">
                      <span className="text-[color:var(--color-ink-400)] md:hidden">Role: </span>
                      {membership.role}
                    </span>
                    <span className="text-[color:var(--color-ink-500)]">
                      <span className="text-[color:var(--color-ink-400)] md:hidden">Joined: </span>
                      {formatDate(membership.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {canManage ? (
            <TeamInviteForm />
          ) : (
            <Card>
              <CardHeader
                eyebrow="Invitations"
                title="Invite a member"
                description="Ask a workspace owner or admin to send invites."
              />
              <CardBody>
                <p className="text-[13px] text-[color:var(--color-ink-500)]">
                  You don&apos;t have permission to invite new members.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {canManage ? (
          <Card>
            <CardHeader
              eyebrow="Outstanding"
              title="Pending invitations"
              description="Invites that haven't been accepted yet."
            />
            <CardBody>
              {(invitations ?? []).length ? (
                <div className="space-y-2">
                  {invitations?.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3 text-[13px]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-[11px] font-semibold text-amber-700">
                          {initials(invitation.email)}
                        </div>
                        <div>
                          <p className="font-medium text-[color:var(--color-ink-900)]">
                            {invitation.email}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">
                            {invitation.role} · expires {formatDate(invitation.expires_at)}
                          </p>
                        </div>
                      </div>
                      <TeamInvitationActions invitationId={invitation.id} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[color:var(--color-ink-500)]">
                  No pending invitations.
                </p>
              )}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
