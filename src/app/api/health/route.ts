import { NextResponse } from "next/server";

function readSupabaseProjectRef() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) return null;

  try {
    return new URL(value).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function readJwtPayload(token: string | undefined) {
  if (!token) return null;
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    return JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { ref?: string; role?: string };
  } catch {
    return null;
  }
}

export async function GET() {
  const anonPayload = readJwtPayload(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const servicePayload = readJwtPayload(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    ok: true,
    app: "HyperOptimal Management",
    supabase: {
      projectRef: readSupabaseProjectRef(),
      publishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      anonKeyRef: anonPayload?.ref ?? null,
      anonKeyRole: anonPayload?.role ?? null,
      serviceRoleRef: servicePayload?.ref ?? null,
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    time: new Date().toISOString(),
  });
}
