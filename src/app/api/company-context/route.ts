import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import {
  normalizeCompanyContext,
  updateCompanyContext,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  id?: string;
  title?: string;
  status?: "draft" | "confirmed";
  data?: unknown;
};

export async function PUT(request: Request) {
  const payload = (await request.json()) as Payload;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const context = await updateCompanyContext(
    supabase,
    organization,
    user,
    normalizeCompanyContext(payload.data),
    payload.id,
    payload.title,
    payload.status,
  );

  return NextResponse.json({ ok: true, context, updatedAt: context.updated_at });
}
