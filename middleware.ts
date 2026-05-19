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

function isMiddlewareBypassEnabled() {
  const bypassRequested =
    process.env.AUTH_BYPASS_ENABLED === "true" ||
    process.env.DISABLE_LOGIN_AUTH === "true";

  if (!bypassRequested && process.env.REQUIRE_LOGIN_AUTH === "true") {
    return false;
  }

  return Boolean(
    bypassRequested &&
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
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isMiddlewareBypassEnabled()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
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
    "/admin/:path*",
    "/learn/:path*",
    "/management/:path*",
    "/meetings/:path*",
    "/settings/:path*",
  ],
};
