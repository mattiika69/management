import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

type Payload = {
  dayNumber?: number;
  itemOrder?: number;
  itemType?: string;
  title?: string;
  estimatedMinutes?: number;
  resourceUrl?: string;
  details?: string;
  sopReference?: string;
  status?: string;
};

const itemTypes = new Set(["learning", "task", "sop", "meeting", "review"]);
const statuses = new Set(["active", "complete", "archived"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function buildPatch(payload: Payload, userId: string) {
  const patch: Record<string, unknown> = {
    updated_by_user_id: userId,
  };

  if (payload.dayNumber !== undefined) patch.day_number = boundedNumber(payload.dayNumber, 1, 1, 90);
  if (payload.itemOrder !== undefined) patch.item_order = boundedNumber(payload.itemOrder, 0, 0, 10000);
  if (payload.itemType !== undefined && itemTypes.has(payload.itemType)) patch.item_type = payload.itemType;
  if (payload.title !== undefined) {
    const title = cleanText(payload.title);
    if (!title) return { error: "Training item title is required." };
    patch.title = title;
  }
  if (payload.estimatedMinutes !== undefined) {
    patch.estimated_minutes = boundedNumber(payload.estimatedMinutes, 15, 0, 1440);
  }
  if (payload.resourceUrl !== undefined) patch.resource_url = cleanText(payload.resourceUrl);
  if (payload.details !== undefined) patch.details = cleanText(payload.details);
  if (payload.sopReference !== undefined) patch.sop_reference = cleanText(payload.sopReference);
  if (payload.status !== undefined && statuses.has(payload.status)) patch.status = payload.status;

  return { data: patch };
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const prepared = buildPatch(payload, context.user.id);
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("management_training_items")
      .update(prepared.data)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .select("id,program_id,day_number,item_order,item_type,title,estimated_minutes,resource_url,details,sop_reference,status,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "management.training_item.updated", {
      targetTable: "management_training_items",
      targetId: id,
    });

    return NextResponse.json({ trainingItem: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const { error } = await context.supabase
      .from("management_training_items")
      .update({ archived_at: new Date().toISOString(), updated_by_user_id: context.user.id })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);

    await auditAction(context, "management.training_item.archived", {
      targetTable: "management_training_items",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
