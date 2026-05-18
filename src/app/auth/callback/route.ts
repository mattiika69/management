import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next") ?? "/");
  const origin = requestUrl.origin;
  const providerError = requestUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(next)}&notice=auth-callback-failed`,
    );
  }

  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?next=${encodeURIComponent(next)}&notice=auth-callback-failed`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
