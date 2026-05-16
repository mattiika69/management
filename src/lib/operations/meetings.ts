import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Organization } from "@/lib/hyperoptimal/server";
import { listWorkspacePeople, type WorkspacePerson } from "@/lib/operations/people";

export type MeetingType = "team" | "training" | "one_on_one" | "client" | "planning";

export type Meeting = {
  id: string;
  meeting_type: MeetingType;
  title: string;
  meeting_date: string;
  owner_user_id: string | null;
  employee_user_id: string | null;
  client_name: string | null;
  next_meeting_date: string | null;
  notes: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MeetingAttendee = {
  id: string;
  meeting_id: string;
  user_id: string | null;
  display_name: string | null;
};

export type MeetingAgendaItem = {
  id: string;
  meeting_id: string;
  item_order: number;
  title: string;
  audience: string;
  minutes: number;
  completed: boolean;
  metadata: Record<string, unknown>;
};

export type MeetingActionItem = {
  id: string;
  meeting_id: string;
  item_order: number;
  title: string;
  owner_user_id: string | null;
  due_date: string | null;
  add_to_calendar: boolean;
  completed: boolean;
  metadata: Record<string, unknown>;
};

export type MeetingDecision = {
  id: string;
  meeting_id: string;
  item_order: number;
  decision_text: string;
  accepted: boolean;
};

export type MeetingTrainingItem = {
  id: string;
  meeting_id: string;
  item_order: number;
  trainee_user_id: string | null;
  trainer_user_id: string | null;
  task: string;
  sop_reference: string;
  you_do_it: boolean;
  they_do_it: boolean;
  metadata: Record<string, unknown>;
};

export type MeetingsData = {
  people: WorkspacePerson[];
  meetings: Meeting[];
  attendees: MeetingAttendee[];
  agendaItems: MeetingAgendaItem[];
  actionItems: MeetingActionItem[];
  decisions: MeetingDecision[];
  trainingItems: MeetingTrainingItem[];
};

export const TEAM_MEETING_AGENDA = [
  { title: "Segue / Wins & Celebrations", audience: "All", minutes: 5 },
  { title: "Scorecard Review", audience: "Owner", minutes: 5 },
  { title: "Weekly Leaderboard Review (Work Forms + Workflows)", audience: "All", minutes: 10 },
  { title: "Rock Review (Quarterly Goals)", audience: "All", minutes: 5 },
  { title: "Customer/Employee Headlines", audience: "All", minutes: 5 },
  { title: "To-Do List Review", audience: "All", minutes: 5 },
  { title: "IDS (Identify, Discuss, Solve)", audience: "All", minutes: 50 },
  { title: "Conclude (Recap, Rating, Close)", audience: "Owner", minutes: 5 },
];

const meetingSelect =
  "id,meeting_type,title,meeting_date,owner_user_id,employee_user_id,client_name,next_meeting_date,notes,metadata,created_at,updated_at";

async function readRows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getMeetingsData(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
): Promise<MeetingsData> {
  const people = await listWorkspacePeople(supabase, organization.id, user);
  const meetings = await readRows(
    supabase
      .from("meetings")
      .select(meetingSelect)
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .order("meeting_date", { ascending: false })
      .limit(80)
      .returns<Meeting[]>(),
  );

  const meetingIds = meetings.map((meeting) => meeting.id);

  if (!meetingIds.length) {
    return {
      people,
      meetings,
      attendees: [],
      agendaItems: [],
      actionItems: [],
      decisions: [],
      trainingItems: [],
    };
  }

  const [attendees, agendaItems, actionItems, decisions, trainingItems] = await Promise.all([
    readRows(
      supabase
        .from("meeting_attendees")
        .select("id,meeting_id,user_id,display_name")
        .in("meeting_id", meetingIds)
        .returns<MeetingAttendee[]>(),
    ),
    readRows(
      supabase
        .from("meeting_agenda_items")
        .select("id,meeting_id,item_order,title,audience,minutes,completed,metadata")
        .in("meeting_id", meetingIds)
        .order("item_order", { ascending: true })
        .returns<MeetingAgendaItem[]>(),
    ),
    readRows(
      supabase
        .from("meeting_action_items")
        .select("id,meeting_id,item_order,title,owner_user_id,due_date,add_to_calendar,completed,metadata")
        .in("meeting_id", meetingIds)
        .is("archived_at", null)
        .order("item_order", { ascending: true })
        .returns<MeetingActionItem[]>(),
    ),
    readRows(
      supabase
        .from("meeting_decisions")
        .select("id,meeting_id,item_order,decision_text,accepted")
        .in("meeting_id", meetingIds)
        .order("item_order", { ascending: true })
        .returns<MeetingDecision[]>(),
    ),
    readRows(
      supabase
        .from("meeting_training_items")
        .select("id,meeting_id,item_order,trainee_user_id,trainer_user_id,task,sop_reference,you_do_it,they_do_it,metadata")
        .in("meeting_id", meetingIds)
        .order("item_order", { ascending: true })
        .returns<MeetingTrainingItem[]>(),
    ),
  ]);

  return {
    people,
    meetings,
    attendees,
    agendaItems,
    actionItems,
    decisions,
    trainingItems,
  };
}
