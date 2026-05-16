import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { auditAction, jsonError, requireTenantContext } from "@/lib/tenant-context";
import type { MeetingType } from "@/lib/operations/meetings";

type AttendeeInput = {
  userId?: string | null;
  displayName?: string | null;
};

type AgendaInput = {
  title?: string;
  audience?: string;
  minutes?: number;
  completed?: boolean;
  metadata?: Record<string, unknown>;
};

type ActionInput = {
  title?: string;
  ownerUserId?: string | null;
  dueDate?: string | null;
  addToCalendar?: boolean;
  completed?: boolean;
  metadata?: Record<string, unknown>;
};

type DecisionInput = {
  decisionText?: string;
  accepted?: boolean;
};

type TrainingInput = {
  traineeUserId?: string | null;
  trainerUserId?: string | null;
  task?: string;
  sopReference?: string;
  youDoIt?: boolean;
  theyDoIt?: boolean;
  metadata?: Record<string, unknown>;
};

type Payload = {
  id?: string;
  meetingType?: MeetingType;
  title?: string;
  meetingDate?: string;
  ownerUserId?: string | null;
  employeeUserId?: string | null;
  clientName?: string | null;
  nextMeetingDate?: string | null;
  notes?: string;
  metadata?: Record<string, unknown>;
  attendees?: AttendeeInput[];
  agendaItems?: AgendaInput[];
  actionItems?: ActionInput[];
  decisions?: DecisionInput[];
  trainingItems?: TrainingInput[];
};

const meetingTypes = new Set(["team", "training", "one_on_one", "client"]);

function cleanDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanMinutes(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    const admin = createAdminClient();
    const payload = (await request.json()) as Payload;
    const meetingType = payload.meetingType;

    if (!meetingType || !meetingTypes.has(meetingType)) {
      return NextResponse.json({ error: "Meeting type is invalid." }, { status: 400 });
    }

    const meetingDate = cleanDate(payload.meetingDate);
    if (!meetingDate) {
      return NextResponse.json({ error: "Meeting date is required." }, { status: 400 });
    }

    const meetingRecord = {
      tenant_id: context.tenant.id,
      organization_id: context.tenant.id,
      meeting_type: meetingType,
      title: cleanText(payload.title) || "New Meeting",
      meeting_date: meetingDate,
      owner_user_id: cleanId(payload.ownerUserId),
      employee_user_id: cleanId(payload.employeeUserId),
      client_name: cleanText(payload.clientName) || null,
      next_meeting_date: cleanDate(payload.nextMeetingDate),
      notes: cleanText(payload.notes),
      metadata: payload.metadata ?? {},
      updated_by_user_id: context.user.id,
    };

    const existingId = cleanId(payload.id);
    const parentQuery = existingId
      ? admin
          .from("meetings")
          .update(meetingRecord)
          .eq("id", existingId)
          .eq("tenant_id", context.tenant.id)
          .select("id,meeting_type,title,meeting_date,owner_user_id,employee_user_id,client_name,next_meeting_date,notes,metadata,created_at,updated_at")
          .single()
      : admin
          .from("meetings")
          .insert({ ...meetingRecord, created_by_user_id: context.user.id })
          .select("id,meeting_type,title,meeting_date,owner_user_id,employee_user_id,client_name,next_meeting_date,notes,metadata,created_at,updated_at")
          .single();

    const { data: meeting, error: meetingError } = await parentQuery;
    if (meetingError) throw new Error(meetingError.message);

    await Promise.all([
      admin.from("meeting_attendees").delete().eq("meeting_id", meeting.id).eq("tenant_id", context.tenant.id),
      admin.from("meeting_agenda_items").delete().eq("meeting_id", meeting.id).eq("tenant_id", context.tenant.id),
      admin.from("meeting_action_items").delete().eq("meeting_id", meeting.id).eq("tenant_id", context.tenant.id),
      admin.from("meeting_decisions").delete().eq("meeting_id", meeting.id).eq("tenant_id", context.tenant.id),
      admin.from("meeting_training_items").delete().eq("meeting_id", meeting.id).eq("tenant_id", context.tenant.id),
    ]);

    const baseChild = {
      tenant_id: context.tenant.id,
      organization_id: context.tenant.id,
      meeting_id: meeting.id,
    };

    const attendeeRows = (payload.attendees ?? [])
      .map((attendee) => ({
        ...baseChild,
        user_id: cleanId(attendee.userId),
        display_name: cleanText(attendee.displayName) || null,
      }))
      .filter((attendee) => attendee.user_id || attendee.display_name);

    const agendaRows = (payload.agendaItems ?? [])
      .map((item, index) => ({
        ...baseChild,
        item_order: index,
        title: cleanText(item.title),
        audience: cleanText(item.audience) || "All",
        minutes: cleanMinutes(item.minutes),
        completed: Boolean(item.completed),
        metadata: item.metadata ?? {},
      }))
      .filter((item) => item.title);

    const actionRows = (payload.actionItems ?? [])
      .map((item, index) => ({
        ...baseChild,
        item_order: index,
        title: cleanText(item.title),
        owner_user_id: cleanId(item.ownerUserId),
        due_date: cleanDate(item.dueDate),
        add_to_calendar: Boolean(item.addToCalendar),
        completed: Boolean(item.completed),
        metadata: item.metadata ?? {},
      }))
      .filter((item) => item.title);

    const decisionRows = (payload.decisions ?? [])
      .map((item, index) => ({
        ...baseChild,
        item_order: index,
        decision_text: cleanText(item.decisionText),
        accepted: item.accepted !== false,
      }))
      .filter((item) => item.decision_text);

    const trainingRows = (payload.trainingItems ?? [])
      .map((item, index) => ({
        ...baseChild,
        item_order: index,
        trainee_user_id: cleanId(item.traineeUserId),
        trainer_user_id: cleanId(item.trainerUserId),
        task: cleanText(item.task),
        sop_reference: cleanText(item.sopReference),
        you_do_it: Boolean(item.youDoIt),
        they_do_it: Boolean(item.theyDoIt),
        metadata: item.metadata ?? {},
      }))
      .filter((item) => item.trainee_user_id || item.trainer_user_id || item.task || item.sop_reference);

    const insertResults = await Promise.all([
      attendeeRows.length ? admin.from("meeting_attendees").insert(attendeeRows) : Promise.resolve({ error: null }),
      agendaRows.length ? admin.from("meeting_agenda_items").insert(agendaRows) : Promise.resolve({ error: null }),
      actionRows.length ? admin.from("meeting_action_items").insert(actionRows) : Promise.resolve({ error: null }),
      decisionRows.length ? admin.from("meeting_decisions").insert(decisionRows) : Promise.resolve({ error: null }),
      trainingRows.length ? admin.from("meeting_training_items").insert(trainingRows) : Promise.resolve({ error: null }),
    ]);

    const childError = insertResults.find((result) => result.error)?.error;
    if (childError) throw new Error(childError.message);

    await auditAction(context, "meeting.saved", {
      targetTable: "meetings",
      targetId: meeting.id,
      metadata: { meetingType },
    });

    return NextResponse.json({ ok: true, meeting });
  } catch (error) {
    return jsonError(error);
  }
}
