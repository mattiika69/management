import { NextResponse } from "next/server";
import {
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  connectCalendarProvider,
  readCookie,
} from "@/lib/oauth/provider-oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/tenant-context";

function redirectBack(request: Request, params: Record<string, string>) {
  const url = new URL(request.url);
  const returnTo = decodeURIComponent(readCookie(request, OAUTH_RETURN_COOKIE)) || "/settings/calendars";
  const target = new URL(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/settings/calendars", url.origin);
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  const response = NextResponse.redirect(target);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_RETURN_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const expectedState = decodeURIComponent(readCookie(request, OAUTH_STATE_COOKIE));
  const providerError = url.searchParams.get("error")?.trim();

  if (providerError) return redirectBack(request, { calendar: "error" });
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectBack(request, { calendar: "error" });
  }

  try {
    const context = await requireTenantContext(await createClient());
    await connectCalendarProvider(createAdminClient(), context, "microsoft_calendar", code, url.origin);
    return redirectBack(request, { calendar: "connected" });
  } catch {
    return redirectBack(request, { calendar: "error" });
  }
}
