import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/organization";
import { createSessionClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : null;
}

function authCookieName(name: string) {
  const normalized = name.toLowerCase();
  return (
    name.startsWith("sb-") ||
    normalized.includes("supabase") ||
    normalized.includes("auth-token")
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const loginUrl = new URL("/login", requestUrl.origin);
  if (next) {
    loginUrl.searchParams.set("next", next);
  }

  const response = NextResponse.redirect(loginUrl);
  request.cookies.getAll().forEach((cookie) => {
    if (authCookieName(cookie.name)) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    }
  });

  response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, "", {
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });

  return response;
}
