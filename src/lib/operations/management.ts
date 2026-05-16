import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Organization } from "@/lib/hyperoptimal/server";
import { getWeekStart } from "@/lib/operations/dates";
import { listWorkspacePeople, type WorkspacePerson } from "@/lib/operations/people";

export type ManagementReview = {
  id: string;
  subject_key: string;
  subject_name: string;
  member_user_id: string | null;
  week_start: string;
  start_stop_keep_complete: boolean;
  progress_complete: boolean;
  management_diamond_complete: boolean;
  team_rating_complete: boolean;
};

export type StartStopKeepItem = {
  id: string;
  subject_key: string;
  subject_name: string;
  member_user_id: string | null;
  week_start: string;
  category: "start" | "stop" | "keep";
  item_text: string;
  completed: boolean;
  created_at: string;
};

export type ManagementDiamondEntry = {
  id: string;
  subject_key: string;
  subject_name: string;
  member_user_id: string | null;
  week_start: string;
  day_index: number;
  task: string;
  task_time: string;
  finished: boolean;
  why_not: string;
  how_to_fix: string;
};

export type ManagementTeamRating = {
  id: string;
  subject_key: string;
  subject_name: string;
  member_user_id: string | null;
  week_start: string;
  current_week_score: number | null;
  four_week_average: number | null;
  attitude_score: number | null;
  participation_score: number | null;
  work_quantity_score: number | null;
  work_quality_score: number | null;
  improvement_score: number | null;
  trend: number | null;
  notes: string;
};

export type ManagementData = {
  weekStart: string;
  people: WorkspacePerson[];
  reviews: ManagementReview[];
  startStopKeepItems: StartStopKeepItem[];
  diamondEntries: ManagementDiamondEntry[];
  teamRatings: ManagementTeamRating[];
};

const reviewSelect =
  "id,subject_key,subject_name,member_user_id,week_start,start_stop_keep_complete,progress_complete,management_diamond_complete,team_rating_complete";
const startStopKeepSelect =
  "id,subject_key,subject_name,member_user_id,week_start,category,item_text,completed,created_at";
const diamondSelect =
  "id,subject_key,subject_name,member_user_id,week_start,day_index,task,task_time,finished,why_not,how_to_fix";
const ratingSelect =
  "id,subject_key,subject_name,member_user_id,week_start,current_week_score,four_week_average,attitude_score,participation_score,work_quantity_score,work_quality_score,improvement_score,trend,notes";

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

export async function getManagementData(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  inputWeekStart?: string,
): Promise<ManagementData> {
  const weekStart = inputWeekStart || getWeekStart();
  const people = await listWorkspacePeople(supabase, organization.id, user);

  const [reviews, startStopKeepItems, diamondEntries, teamRatings] = await Promise.all([
    readRows(
      supabase
        .from("management_weekly_reviews")
        .select(reviewSelect)
        .eq("tenant_id", organization.id)
        .eq("week_start", weekStart)
        .is("archived_at", null)
        .returns<ManagementReview[]>(),
    ),
    readRows(
      supabase
        .from("management_start_stop_keep_items")
        .select(startStopKeepSelect)
        .eq("tenant_id", organization.id)
        .eq("week_start", weekStart)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
        .returns<StartStopKeepItem[]>(),
    ),
    readRows(
      supabase
        .from("management_diamond_entries")
        .select(diamondSelect)
        .eq("tenant_id", organization.id)
        .eq("week_start", weekStart)
        .is("archived_at", null)
        .returns<ManagementDiamondEntry[]>(),
    ),
    readRows(
      supabase
        .from("management_team_ratings")
        .select(ratingSelect)
        .eq("tenant_id", organization.id)
        .eq("week_start", weekStart)
        .is("archived_at", null)
        .returns<ManagementTeamRating[]>(),
    ),
  ]);

  return {
    weekStart,
    people,
    reviews,
    startStopKeepItems,
    diamondEntries,
    teamRatings,
  };
}
