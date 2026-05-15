import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

type LeadPayload = {
  email?: string;
  name?: string;
  source?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as LeadPayload;
  const email = payload.email?.trim().toLowerCase();
  const name = payload.name?.trim() || null;
  const source = payload.source?.trim() || "homepage";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { error } = await supabase.from("leads").insert({
    email,
    name,
    source,
    organization_id: organization.id,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
