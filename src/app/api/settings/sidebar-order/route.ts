import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { normalizeSidebarOrder } from "@/lib/sidebar";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  order?: unknown;
};

async function getRequestContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Authentication is required." }, { status: 401 }) };
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  return { supabase, user, organization };
}

export async function GET() {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const { data, error } = await context.supabase
    .from("user_sidebar_preferences")
    .select("item_order")
    .eq("organization_id", context.organization.id)
    .eq("user_id", context.user.id)
    .maybeSingle<{ item_order: string[] }>();

  if (error) {
    return NextResponse.json({ order: normalizeSidebarOrder([]) });
  }

  return NextResponse.json({ order: normalizeSidebarOrder(data?.item_order) });
}

export async function PUT(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const payload = (await request.json().catch(() => ({}))) as Payload;
  const order = normalizeSidebarOrder(payload.order);
  const { error } = await context.supabase.from("user_sidebar_preferences").upsert(
    {
      organization_id: context.organization.id,
      user_id: context.user.id,
      item_order: order,
      updated_by: context.user.id,
    },
    { onConflict: "organization_id,user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, order });
}
