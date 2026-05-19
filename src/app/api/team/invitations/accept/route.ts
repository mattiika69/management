import { NextResponse } from "next/server";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/organization";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createSessionClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/team/invitations";

type AcceptPayload = {
  token?: string;
};

type AcceptResult = {
  ok: boolean;
  tenant_id: string | null;
  invitation_id: string | null;
  status: string;
  message: string;
};

function statusCodeFor(result: AcceptResult) {
  if (result.ok) return 200;
  if (result.status === "authentication_required") return 401;
  if (result.status === "email_unconfirmed" || result.status === "wrong_email") return 403;
  if (result.status === "expired" || result.status === "inactive") return 410;
  if (result.status === "not_found") return 404;
  return 400;
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as AcceptPayload;
  const token = payload.token?.trim();

  if (!token || token.length > 256) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const tokenHash = hashInvitationToken(token);
  const { data, error } = await supabase.rpc("accept_team_invitation", {
    invite_token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.json(
      { error: "Invitation could not be accepted." },
      { status: 400 },
    );
  }

  const result = Array.isArray(data) ? (data[0] as AcceptResult | undefined) : undefined;
  if (!result) {
    return NextResponse.json(
      { error: "Invitation could not be accepted." },
      { status: 400 },
    );
  }

  if (!result.ok || !result.tenant_id) {
    return NextResponse.json(
      { error: result.message || "Invitation could not be accepted." },
      { status: statusCodeFor(result) },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, result.tenant_id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
