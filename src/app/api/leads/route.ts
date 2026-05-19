import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type LeadPayload = {
  email?: string;
  name?: string;
  source?: string;
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LeadPayload;
    const email = payload.email?.trim().toLowerCase();
    const name = payload.name?.trim().slice(0, 160) || null;
    const source = payload.source?.trim().slice(0, 80) || "homepage";

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
    const { error } = await context.supabase.from("leads").insert({
      email,
      name,
      source,
      organization_id: context.tenant.id,
      created_by: context.user.id,
    });

    if (error) {
      return NextResponse.json(
        { error: "Lead could not be saved." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
