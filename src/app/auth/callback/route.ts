import { NextResponse } from "next/server";
import { bootstrapSignupOrganization } from "@/lib/auth/organization";
import { redirectSearchParams, safeRelativePath } from "@/lib/auth/redirects";
import { createSessionClient } from "@/lib/supabase/server";

type OtpType = "signup" | "recovery" | "invite" | "magiclink" | "email_change" | "email";

function safeOtpType(value: string | null): OtpType {
  if (
    value === "signup" ||
    value === "recovery" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "email_change" ||
    value === "email"
  ) {
    return value;
  }

  return "signup";
}

function loginWithNotice(origin: string, next: string, notice: string) {
  return NextResponse.redirect(
    `${origin}/login?redirect=${encodeURIComponent(next)}&notice=${notice}`,
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = safeOtpType(requestUrl.searchParams.get("type"));
  const next = redirectSearchParams(requestUrl.searchParams, "/");
  const origin = requestUrl.origin;
  const providerError = requestUrl.searchParams.get("error");

  if (providerError) {
    return loginWithNotice(origin, next, "auth-callback-failed");
  }

  const supabase = await createSessionClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginWithNotice(origin, next, "auth-callback-failed");
    }
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      const notice = error.message.toLowerCase().includes("expired")
        ? "expired-email-link"
        : "auth-callback-failed";
      return loginWithNotice(origin, next, notice);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && type === "signup" && !safeRelativePath(next).startsWith("/invite/")) {
    try {
      await bootstrapSignupOrganization(supabase, user);
    } catch {
      return loginWithNotice(origin, "/login", "organization-setup-failed");
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
