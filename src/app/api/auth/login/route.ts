import { NextResponse } from "next/server";
import { redirectSearchParams, safeRelativePath } from "@/lib/auth/redirects";
import { normalizeEmail } from "@/lib/resend/server";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  requestIp,
} from "@/lib/security/rate-limit";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createSessionClient } from "@/lib/supabase/server";

type LoginPayload = {
  email?: string;
  password?: string;
  redirect?: string;
  next?: string;
};

function loginErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many login attempts. Please wait and try again.";
  }
  return "Authentication provider is temporarily unavailable. Please retry in a minute.";
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as LoginPayload;
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === "string" ? payload.password : "";
  const redirectTo = safeRelativePath(payload.redirect ?? payload.next, "/");

  if (!email) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const limit = checkRateLimit({
    key: rateLimitKey(["login", requestIp(request), email]),
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: loginErrorMessage(error.message) }, { status: 401 });
  }

  return NextResponse.json({ ok: true, redirectTo });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = redirectSearchParams(url.searchParams, "/");
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
