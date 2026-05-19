import { NextResponse } from "next/server";
import { normalizeSidebarOrder } from "@/lib/sidebar";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  order?: unknown;
};

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());

    const { data, error } = await context.supabase
      .from("user_sidebar_preferences")
      .select("item_order")
      .eq("organization_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .maybeSingle<{ item_order: string[] }>();

    if (error) {
      return NextResponse.json({
        order: normalizeSidebarOrder([]),
        organizationName: context.tenant.name,
      });
    }

    return NextResponse.json({
      order: normalizeSidebarOrder(data?.item_order),
      organizationName: context.tenant.name,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());

    const payload = (await request.json().catch(() => ({}))) as Payload;
    const order = normalizeSidebarOrder(payload.order);
    const { error } = await context.supabase.from("user_sidebar_preferences").upsert(
      {
        organization_id: context.tenant.id,
        user_id: context.user.id,
        item_order: order,
        updated_by: context.user.id,
      },
      { onConflict: "organization_id,user_id" },
    );

    if (error) {
      return NextResponse.json(
        { error: "Sidebar order could not be saved." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return jsonError(error);
  }
}
