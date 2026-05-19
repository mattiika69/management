import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/resend/server";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/admin";

type PublicLeadPayload = {
  email?: string;
  name?: string;
  source?: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\r\n<>]/g, "").trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as PublicLeadPayload;
  const email = normalizeEmail(payload.email);
  const name = cleanText(payload.name, 160) || null;
  const source = cleanText(payload.source, 80) || "opt-in";

  if (!email) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("leads").insert({
    email,
    name,
    source,
  });

  if (error) {
    return NextResponse.json({ error: "Your request could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
