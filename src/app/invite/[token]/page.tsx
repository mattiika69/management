import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/team/invitations";

type RouteProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    code?: string | string[];
    error?: string | string[];
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function currentTimestamp() {
  return Date.now();
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-10">
      <section className="mx-auto max-w-xl border border-[#d9d7cb] bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]"
        >
          HyperOptimal Management
        </Link>
        {children}
      </section>
    </main>
  );
}

export default async function InvitePage({ params, searchParams }: RouteProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};
  const code = firstParam(query.code);
  const error = firstParam(query.error);

  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(`/invite/${token}`)}`,
    );
  }

  if (error) {
    redirect(
      `/login?next=${encodeURIComponent(`/invite/${token}`)}&notice=invite-auth-failed`,
    );
  }

  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token);
  const { data: invitation } = await admin
    .from("organization_invitations")
    .select("id,organization_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<Invitation>();

  if (!invitation) {
    return (
      <InviteShell>
        <h1 className="mt-5 text-3xl font-bold text-[#171717]">Invite not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d5d55]">
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
      <InviteShell>
        <h1 className="mt-5 text-3xl font-bold text-[#171717]">
          Invite no longer active
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5d5d55]">
          Ask a workspace admin to send a new invitation.
        </p>
      </InviteShell>
    );
  }

  const now = await currentTimestamp();
  if (new Date(invitation.expires_at).getTime() < now) {
    return (
      <InviteShell>
        <h1 className="mt-5 text-3xl font-bold text-[#171717]">
          Invite expired
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5d5d55]">
          Ask a workspace admin to send a new invitation to {invitation.email}.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block border border-[#0f766e] px-5 py-3 text-sm font-semibold text-[#0f766e]"
        >
          Back to login
        </Link>
      </InviteShell>
    );
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <InviteShell>
        <h1 className="mt-5 text-3xl font-bold text-[#171717]">
          Join {organizationName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5d5d55]">
          This invitation was sent to {invitation.email}. Log in or create an
          account with that email to accept it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={authHref("/login", token)}
            className="bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white"
          >
            Log in
          </Link>
          <Link
            href={authHref("/signup", token)}
            className="border border-[#0f766e] px-5 py-3 text-sm font-semibold text-[#0f766e]"
          >
            Create account
          </Link>
        </div>
      </InviteShell>
    );
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InviteShell>
        <h1 className="mt-5 text-3xl font-bold text-[#171717]">
          Wrong account
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5d5d55]">
          This invitation was sent to {invitation.email}. You are signed in as{" "}
          {user.email}.
        </p>
        <Link
          href={authHref("/login", token)}
          className="mt-6 inline-block border border-[#0f766e] px-5 py-3 text-sm font-semibold text-[#0f766e]"
        >
          Use another account
        </Link>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <h1 className="mt-5 text-3xl font-bold text-[#171717]">
        Join {organizationName}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#5d5d55]">
        Accept this invitation to join the workspace as {invitation.role}.
      </p>
      <div className="mt-6">
        <AcceptInviteButton token={token} />
      </div>
    </InviteShell>
  );
}
