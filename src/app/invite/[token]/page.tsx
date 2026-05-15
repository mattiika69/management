import Link from "next/link";
import type { ReactNode } from "react";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/team/invitations";
import { Badge } from "@/components/ui/badge";

type RouteProps = {
  params: Promise<{
    token: string;
  }>;
};

type Invitation = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

type Organization = {
  name: string;
};

function authHref(path: string, token: string) {
  return `${path}?next=${encodeURIComponent(`/invite/${token}`)}`;
}

function InviteShell({
  children,
  eyebrow = "Invitation",
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <main className="min-h-screen bg-[color:var(--color-bg)]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-stretch justify-center px-6 py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 self-start text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--color-ink-900)]">
            <span className="text-[10px] font-bold text-white">H</span>
          </div>
          HyperOptimal
        </Link>
        <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
          <Badge tone="brand">{eyebrow}</Badge>
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function InvitePage({ params }: RouteProps) {
  const { token } = await params;
  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token);
  const { data: invitation } = await admin
    .from("organization_invitations")
    .select("id,organization_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<Invitation>();

  if (!invitation) {
    return (
      <InviteShell eyebrow="Not found">
        <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Invite not found
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          This invitation link is invalid or has been replaced.
        </p>
      </InviteShell>
    );
  }

  const { data: organization } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .single<Organization>();

  const organizationName = organization?.name ?? "this workspace";

  if (invitation.accepted_at || invitation.revoked_at) {
    return (
      <InviteShell eyebrow="Inactive">
        <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Invite no longer active
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          Ask a workspace admin to send a new invitation.
        </p>
      </InviteShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <InviteShell>
        <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Join {organizationName}
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          This invitation was sent to{" "}
          <span className="font-medium text-[color:var(--color-ink-900)]">
            {invitation.email}
          </span>
          . Log in or create an account with that email to accept it.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={authHref("/login", token)}
            className="inline-flex h-10 items-center rounded-lg bg-[color:var(--color-ink-900)] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--color-ink-700)]"
          >
            Log in
          </Link>
          <Link
            href={authHref("/signup", token)}
            className="inline-flex h-10 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 text-[13px] font-medium text-[color:var(--color-ink-900)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
          >
            Create account
          </Link>
        </div>
      </InviteShell>
    );
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InviteShell eyebrow="Wrong account">
        <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Account mismatch
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
          This invitation was sent to{" "}
          <span className="font-medium text-[color:var(--color-ink-900)]">
            {invitation.email}
          </span>
          . You&apos;re signed in as{" "}
          <span className="font-medium text-[color:var(--color-ink-900)]">
            {user.email}
          </span>
          .
        </p>
        <Link
          href={authHref("/login", token)}
          className="mt-6 inline-flex h-10 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 text-[13px] font-medium text-[color:var(--color-ink-900)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
        >
          Use another account
        </Link>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
        Join {organizationName}
      </h1>
      <p className="mt-2 text-[14px] leading-6 text-[color:var(--color-ink-500)]">
        Accept this invitation to join the workspace as{" "}
        <span className="font-medium capitalize text-[color:var(--color-ink-900)]">
          {invitation.role}
        </span>
        .
      </p>
      <div className="mt-6">
        <AcceptInviteButton token={token} />
      </div>
    </InviteShell>
  );
}
