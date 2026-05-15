import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { isFunnelType } from "@/lib/hyperoptimal/data";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  itemId?: string;
  funnelType?: string;
  title?: string;
  body?: string;
  section?: string;
  itemType?: string;
};

function isSection(value: string): value is "learning" | "training" {
  return value === "learning" || value === "training";
}

function isItemType(value: string): value is "learning" | "training" | "assignment" {
  return value === "learning" || value === "training" || value === "assignment";
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as Payload;
  const itemId = payload.itemId?.trim();
  const funnelType = payload.funnelType?.trim() ?? "";
  const section = payload.section?.trim() ?? "";
  const itemType = payload.itemType?.trim() ?? "";
  const title = payload.title?.trim() ?? "";

  if (!itemId || !isFunnelType(funnelType) || !isSection(section) || !isItemType(itemType) || !title) {
    return NextResponse.json({ error: "A valid learning item is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { error } = await supabase
    .from("funnel_learning_items")
    .update({
      title,
      body: payload.body?.trim() ?? "",
      section,
      item_type: itemType,
      updated_by: user.id,
    })
    .eq("id", itemId)
    .eq("organization_id", organization.id)
    .eq("funnel_type", funnelType);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
