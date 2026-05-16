import { NextResponse } from "next/server";
import { createLearningItem } from "@/lib/learnings/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  itemId?: string;
  title?: string;
  body?: string;
  category?: string;
  sourceProvider?: "web" | "slack" | "telegram";
  sourceLabel?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function provider(value: unknown): "web" | "slack" | "telegram" {
  return value === "slack" || value === "telegram" ? value : "web";
}

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("learning_items")
      .select("id,title,body,category,source_provider,source_label,sync_status,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ learningItems: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    const learningItem = await createLearningItem(context.supabase, context.tenant, context.user, {
      title: text(payload.title),
      body: text(payload.body),
      category: text(payload.category) || "general",
      sourceProvider: provider(payload.sourceProvider),
      sourceLabel: text(payload.sourceLabel),
    });

    return NextResponse.json({ learningItem });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const itemId = text(payload.itemId);
    const title = text(payload.title);

    if (!itemId || !title) {
      return NextResponse.json({ error: "Learning title is required." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("learning_items")
      .update({
        title,
        body: text(payload.body),
        category: text(payload.category) || "general",
        source_provider: provider(payload.sourceProvider),
        source_label: text(payload.sourceLabel),
        updated_by_user_id: context.user.id,
      })
      .eq("id", itemId)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .select("id,title,body,category,source_provider,source_label,sync_status,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ learningItem: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const itemId = text(payload.itemId);

    if (!itemId) {
      return NextResponse.json({ error: "Choose a learning to delete." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
    const { error } = await context.supabase
      .from("learning_items")
      .update({
        archived_at: new Date().toISOString(),
        updated_by_user_id: context.user.id,
      })
      .eq("id", itemId)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
