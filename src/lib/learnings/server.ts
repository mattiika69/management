import type { SupabaseClient, User } from "@supabase/supabase-js";

type Organization = {
  id: string;
};

export type LearningItem = {
  id: string;
  tenant_id: string;
  organization_id: string;
  title: string;
  body: string;
  category: string;
  source_provider: "web" | "slack" | "telegram";
  source_label: string;
  source_external_id: string | null;
  source_thread_id: string | null;
  source_channel_id: string | null;
  source_user_id: string | null;
  sync_status: "ready" | "synced" | "needs_review" | "failed";
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningInput = {
  title: string;
  body?: string;
  category?: string;
  sourceProvider?: "web" | "slack" | "telegram";
  sourceLabel?: string;
  sourceExternalId?: string | null;
  sourceThreadId?: string | null;
  sourceChannelId?: string | null;
  sourceUserId?: string | null;
};

export const learningColumns = [
  "id",
  "tenant_id",
  "organization_id",
  "title",
  "body",
  "category",
  "source_provider",
  "source_label",
  "source_external_id",
  "source_thread_id",
  "source_channel_id",
  "source_user_id",
  "sync_status",
  "created_by_user_id",
  "updated_by_user_id",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

function cleanText(value: string | undefined | null, fallback = "") {
  return value?.trim() || fallback;
}

export async function getLearningItems(
  supabase: SupabaseClient,
  organization: Organization,
  limit = 100,
) {
  const { data, error } = await supabase
    .from("learning_items")
    .select(learningColumns)
    .eq("tenant_id", organization.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit)
    .returns<LearningItem[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createLearningItem(
  supabase: SupabaseClient,
  organization: Organization,
  user: Pick<User, "id">,
  input: LearningInput,
) {
  const title = cleanText(input.title);
  if (!title) {
    throw new Error("Title is required.");
  }

  const { data, error } = await supabase
    .from("learning_items")
    .insert({
      tenant_id: organization.id,
      organization_id: organization.id,
      title,
      body: cleanText(input.body),
      category: cleanText(input.category, "general"),
      source_provider: input.sourceProvider ?? "web",
      source_label: cleanText(input.sourceLabel),
      source_external_id: input.sourceExternalId ?? null,
      source_thread_id: input.sourceThreadId ?? null,
      source_channel_id: input.sourceChannelId ?? null,
      source_user_id: input.sourceUserId ?? null,
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
    })
    .select(learningColumns)
    .single<LearningItem>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function formatLearningsForPrompt(items: Array<Pick<LearningItem, "title" | "body" | "category">>) {
  return items
    .filter((item) => item.title.trim() || item.body.trim())
    .map((item) => [
      `### ${item.title}`,
      item.category ? `Category: ${item.category}` : "",
      item.body,
    ].filter(Boolean).join("\n"))
    .join("\n\n");
}
