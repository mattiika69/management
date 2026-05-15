import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { buildSlackAuthorizeUrl } from "@/lib/integrations/slack";
import { createClient } from "@/lib/supabase/server";

const STATE_COOKIE = "hof_slack_oauth_state";
const RETURN_COOKIE = "hof_slack_oauth_return";

function safeReturnTo(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/settings/slack";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/settings/slack", request.url));
  }

  await getOrCreateDefaultOrganization(supabase, user);
  const state = randomBytes(24).toString("base64url");
  const url = new URL(request.url);
  const origin = url.origin;
  const response = NextResponse.redirect(buildSlackAuthorizeUrl({ origin, state }));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  response.cookies.set(RETURN_COOKIE, safeReturnTo(url.searchParams.get("returnTo")), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
