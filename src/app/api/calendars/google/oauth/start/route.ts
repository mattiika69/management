import { NextResponse } from "next/server";
import {
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  oauthAuthorizeUrl,
  oauthProviderReady,
  randomState,
  safeReturnTo,
} from "@/lib/oauth/provider-oauth";
import { createClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/tenant-context";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    await requireTenantContext(await createClient());
  } catch {
    return NextResponse.redirect(new URL("/login?next=/settings/calendars", request.url));
  }

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
