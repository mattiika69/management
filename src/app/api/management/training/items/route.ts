import { NextResponse } from "next/server";
import { auditAction, jsonError, requireTenantAdmin, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  programId?: string;
  dayNumber?: number;
  itemType?: string;
  title?: string;
  estimatedMinutes?: number;
  resourceUrl?: string;
  details?: string;
  sopReference?: string;
};

const itemTypes = new Set(["learning", "task", "sop", "meeting", "review"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanDay(value: unknown) {
  const day = Number(value);
  if (!Number.isFinite(day)) return 1;
  return Math.max(1, Math.min(90, Math.round(day)));
}

function cleanMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return 15;
  return Math.max(0, Math.min(1440, Math.round(minutes)));
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const programId = cleanText(payload.programId);
    const title = cleanText(payload.title);

    if (!programId) {
      return NextResponse.json({ error: "Training plan is required." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Training item title is required." }, { status: 400 });
    }

    const { data: program, error: programError } = await context.supabase
      .from("management_training_programs")
      .select("id")
      .eq("id", programId)
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .maybeSingle<{ id: string }>();

    if (programError) throw new Error(programError.message);
    if (!program) {
      return NextResponse.json({ error: "Training plan was not found." }, { status: 404 });
    }

    const { data, error } = await context.supabase
      .from("management_training_items")
      .insert({
        tenant_id: context.tenant.id,
        organization_id: context.tenant.id,
        program_id: programId,
        day_number: cleanDay(payload.dayNumber),
        item_type: itemTypes.has(payload.itemType ?? "") ? payload.itemType : "learning",
        title,
        estimated_minutes: cleanMinutes(payload.estimatedMinutes),
        resource_url: cleanText(payload.resourceUrl),
        details: cleanText(payload.details),
        sop_reference: cleanText(payload.sopReference),
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id,program_id,day_number,item_order,item_type,title,estimated_minutes,resource_url,details,sop_reference,status,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    await auditAction(context, "management.training_item.created", {
      targetTable: "management_training_items",
      targetId: data.id,
      metadata: { programId, title: data.title, dayNumber: data.day_number },
    });

    return NextResponse.json({ trainingItem: data });
  } catch (error) {
    return jsonError(error);
  }
}
