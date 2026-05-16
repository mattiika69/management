import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { auditAction, jsonError, requireTenantContext } from "@/lib/tenant-context";

type SubjectPayload = {
  subjectKey?: string;
  subjectName?: string;
  memberUserId?: string | null;
  weekStart?: string;
};

type Payload = SubjectPayload & {
  action?: string;
  field?: string;
  value?: unknown;
  category?: "start" | "stop" | "keep";
  itemText?: string;
  itemId?: string;
  dayIndex?: number;
  entry?: {
    task?: string;
    taskTime?: string;
    finished?: boolean;
    whyNot?: string;
    howToFix?: string;
  };
  rating?: {
    currentWeekScore?: number | null;
    fourWeekAverage?: number | null;
    attitudeScore?: number | null;
    participationScore?: number | null;
    workQuantityScore?: number | null;
    workQualityScore?: number | null;
    improvementScore?: number | null;
    trend?: number | null;
    notes?: string;
  };
};

const reviewFields = new Set([
  "start_stop_keep_complete",
  "progress_complete",
  "management_diamond_complete",
  "team_rating_complete",
]);

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function readSubject(payload: SubjectPayload) {
  return {
    subject_key: requireString(payload.subjectKey, "A team member"),
    subject_name: requireString(payload.subjectName, "A team member"),
    member_user_id: payload.memberUserId ?? null,
    week_start: requireString(payload.weekStart, "A week"),
  };
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    const admin = createAdminClient();
    const payload = (await request.json()) as Payload;
    const subject = readSubject(payload);

    if (payload.action === "setReviewFlag") {
      const field = requireString(payload.field, "A checklist field");
      if (!reviewFields.has(field)) {
        return NextResponse.json({ error: "Checklist field is invalid." }, { status: 400 });
      }

      const { data, error } = await admin
        .from("management_weekly_reviews")
        .upsert(
          {
            tenant_id: context.tenant.id,
            organization_id: context.tenant.id,
            ...subject,
            [field]: Boolean(payload.value),
            updated_by_user_id: context.user.id,
            created_by_user_id: context.user.id,
          },
          { onConflict: "tenant_id,subject_key,week_start" },
        )
        .select(
          "id,subject_key,subject_name,member_user_id,week_start,start_stop_keep_complete,progress_complete,management_diamond_complete,team_rating_complete",
        )
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, review: data });
    }

    if (payload.action === "addStartStopKeepItem") {
      const itemText = requireString(payload.itemText, "An item");
      if (!payload.category || !["start", "stop", "keep"].includes(payload.category)) {
        return NextResponse.json({ error: "Category is invalid." }, { status: 400 });
      }

      const { data, error } = await admin
        .from("management_start_stop_keep_items")
        .insert({
          tenant_id: context.tenant.id,
          organization_id: context.tenant.id,
          ...subject,
          category: payload.category,
          item_text: itemText,
          created_by_user_id: context.user.id,
          updated_by_user_id: context.user.id,
        })
        .select("id,subject_key,subject_name,member_user_id,week_start,category,item_text,completed,created_at")
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, item: data });
    }

    if (payload.action === "archiveStartStopKeepItem") {
      const itemId = requireString(payload.itemId, "An item");
      const { error } = await admin
        .from("management_start_stop_keep_items")
        .update({ archived_at: new Date().toISOString(), updated_by_user_id: context.user.id })
        .eq("id", itemId)
        .eq("tenant_id", context.tenant.id);

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "upsertDiamondEntry") {
      const dayIndex = Number(payload.dayIndex);
      if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
        return NextResponse.json({ error: "Day is invalid." }, { status: 400 });
      }

      const { data, error } = await admin
        .from("management_diamond_entries")
        .upsert(
          {
            tenant_id: context.tenant.id,
            organization_id: context.tenant.id,
            ...subject,
            day_index: dayIndex,
            task: payload.entry?.task ?? "",
            task_time: payload.entry?.taskTime ?? "",
            finished: Boolean(payload.entry?.finished),
            why_not: payload.entry?.whyNot ?? "",
            how_to_fix: payload.entry?.howToFix ?? "",
            updated_by_user_id: context.user.id,
            created_by_user_id: context.user.id,
          },
          { onConflict: "tenant_id,subject_key,week_start,day_index" },
        )
        .select("id,subject_key,subject_name,member_user_id,week_start,day_index,task,task_time,finished,why_not,how_to_fix")
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, entry: data });
    }

    if (payload.action === "upsertTeamRating") {
      const { data, error } = await admin
        .from("management_team_ratings")
        .upsert(
          {
            tenant_id: context.tenant.id,
            organization_id: context.tenant.id,
            ...subject,
            current_week_score: numberOrNull(payload.rating?.currentWeekScore),
            four_week_average: numberOrNull(payload.rating?.fourWeekAverage),
            attitude_score: numberOrNull(payload.rating?.attitudeScore),
            participation_score: numberOrNull(payload.rating?.participationScore),
            work_quantity_score: numberOrNull(payload.rating?.workQuantityScore),
            work_quality_score: numberOrNull(payload.rating?.workQualityScore),
            improvement_score: numberOrNull(payload.rating?.improvementScore),
            trend: numberOrNull(payload.rating?.trend),
            notes: payload.rating?.notes ?? "",
            updated_by_user_id: context.user.id,
            created_by_user_id: context.user.id,
          },
          { onConflict: "tenant_id,subject_key,week_start" },
        )
        .select(
          "id,subject_key,subject_name,member_user_id,week_start,current_week_score,four_week_average,attitude_score,participation_score,work_quantity_score,work_quality_score,improvement_score,trend,notes",
        )
        .single();

      if (error) throw new Error(error.message);
      await auditAction(context, "management.team_rating_saved", {
        targetTable: "management_team_ratings",
        targetId: data.id,
        metadata: { subjectKey: subject.subject_key },
      });
      return NextResponse.json({ ok: true, rating: data });
    }

    return NextResponse.json({ error: "Action is invalid." }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
