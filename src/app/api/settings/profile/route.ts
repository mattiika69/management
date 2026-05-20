import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { jsonError } from "@/lib/tenant-context";

type ProfileMetadata = {
  phoneNumber?: string;
  timezone?: string;
  jobTitle?: string;
  department?: string;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeMetadata(value: unknown): ProfileMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    phoneNumber: cleanText(record.phoneNumber, 40),
    timezone: cleanText(record.timezone, 80) || "America/New_York",
    jobTitle: cleanText(record.jobTitle, 120),
    department: cleanText(record.department, 120),
  };
}

export async function PATCH(request: Request) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const displayName = cleanText(payload.displayName, 120);

    if (!displayName) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("user_profiles")
      .select("metadata,avatar_url")
      .eq("user_id", user.id)
      .maybeSingle<{ metadata: ProfileMetadata | null; avatar_url: string | null }>();

    if (existingError) {
      return NextResponse.json(
        { error: "Profile could not be loaded." },
        { status: 500 },
      );
    }

    const metadata = {
      ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ...normalizeMetadata(payload),
    };

    const { data, error } = await admin
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          email: user.email ?? null,
          display_name: displayName,
          avatar_url: existing?.avatar_url ?? null,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("user_id,email,display_name,avatar_url,metadata,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Profile could not be saved." },
        { status: 500 },
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return jsonError(error);
  }
}
