import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    pathname === "/management" ||
    pathname.startsWith("/management/") ||
    pathname === "/meetings" ||
    pathname.startsWith("/meetings/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}

function originFrom(value: string | null | undefined) {
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function configuredOrigins(request: NextRequest) {
  const host = request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const hostOrigin = host ? originFrom(`${forwardedProto}://${host}`) : "";

  return new Set(
    [
      originFrom(request.url),
      hostOrigin,
      originFrom(process.env.NEXT_PUBLIC_SITE_URL),
      originFrom(
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "",
      ),
      originFrom(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""),
    ].filter(Boolean),
  );
}

function isUnsafeMethod(method: string) {
  return ["DELETE", "PATCH", "POST", "PUT"].includes(method.toUpperCase());
}

function isExternalApiCallback(pathname: string) {
  return (
    pathname.endsWith("/webhook") ||
    pathname === "/api/integrations/slack/commands" ||
    pathname === "/api/integrations/slack/events" ||
    pathname === "/api/integrations/slack/interactions" ||
    pathname === "/api/workflows/scheduled"
  );
}

function sameOriginApiGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !pathname.startsWith("/api/") ||
    !isUnsafeMethod(request.method) ||
    isExternalApiCallback(pathname)
  ) {
    return null;
  }

  const origin = originFrom(request.headers.get("origin"));
  if (!origin || !configuredOrigins(request).has(origin)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return null;
}

function isMiddlewareBypassEnabled() {
  const bypassRequested =
    process.env.AUTH_BYPASS_ENABLED === "true" ||
    process.env.DISABLE_LOGIN_AUTH === "true";

  if (!bypassRequested || process.env.REQUIRE_LOGIN_AUTH === "true") {
    return false;
  }

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return false;
  }

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const nextPath = `${url.pathname}${url.search}`;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const originGuard = sameOriginApiGuard(request);
  if (originGuard) {
    return originGuard;
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isMiddlewareBypassEnabled()) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl || !supabaseKey) {
    return loginRedirect(request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginRedirect(request);
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/learn/:path*",
    "/management/:path*",
    "/meetings/:path*",
    "/settings/:path*",
  ],
};
