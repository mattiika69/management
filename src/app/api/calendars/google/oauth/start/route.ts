import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import {
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  oauthAuthorizeUrl,
  oauthProviderReady,
  randomState,
  safeReturnTo,
} from "@/lib/oauth/provider-oauth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login?next=/settings/calendars", request.url));

  await getOrCreateDefaultOrganization(supabase, user);
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/settings/calendars");

  if (!oauthProviderReady("google_calendar")) {
    return NextResponse.redirect(new URL(`${returnTo}?calendar=unavailable`, url.origin));
  }

  const state = randomState();
  const response = NextResponse.redirect(oauthAuthorizeUrl("google_calendar", url.origin, state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  response.cookies.set(OAUTH_RETURN_COOKIE, returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
