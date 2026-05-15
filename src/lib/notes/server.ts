import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Organization } from "@/lib/hyperoptimal/server";

export type WorkspaceNote = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  source: string;
  folder: string;
  tags: string[];
  visibility: "private" | "shared";
  pinned: boolean;
  context_id: string | null;
  funnel_id: string | null;
  step_id: string | null;
  asset_key: string | null;
  builder_key: string | null;
  ai_output_id: string | null;
  inspiration_category: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteInput = {
  title?: string;
  body?: string;
  source?: string;
  folder?: string;
  tags?: string[];
  visibility?: "private" | "shared";
  pinned?: boolean;
  contextId?: string | null;
  funnelId?: string | null;
  stepId?: string | null;
  assetKey?: string | null;
  builderKey?: string | null;
  aiOutputId?: string | null;
  inspirationCategory?: string | null;
  metadata?: Record<string, unknown>;
};

const noteSelect =
  "id,organization_id,title,body,source,folder,tags,visibility,pinned,context_id,funnel_id,step_id,asset_key,builder_key,ai_output_id,inspiration_category,metadata,created_by,updated_by,created_at,updated_at";

export async function getWorkspaceNotes(
  supabase: SupabaseClient,
  organization: Organization,
) {
  const { data, error } = await supabase
    .from("workspace_notes")
    .select(noteSelect)
    .eq("organization_id", organization.id)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .returns<WorkspaceNote[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createWorkspaceNote(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  input: NoteInput,
) {
  const { data, error } = await supabase
    .from("workspace_notes")
    .insert({
      organization_id: organization.id,
      title: input.title?.trim() || "Untitled",
      body: input.body?.trim() ?? "",
      source: input.source?.trim() || "Manual",
      folder: input.folder?.trim() || "Funnel",
      tags: input.tags ?? [],
      visibility: input.visibility ?? "private",
      pinned: input.pinned ?? false,
      context_id: input.contextId ?? null,
      funnel_id: input.funnelId ?? null,
      step_id: input.stepId ?? null,
      asset_key: input.assetKey ?? null,
      builder_key: input.builderKey ?? null,
      ai_output_id: input.aiOutputId ?? null,
      inspiration_category: input.inspirationCategory ?? null,
      metadata: input.metadata ?? {},
      created_by: user.id,
      updated_by: user.id,
    })
    .select(noteSelect)
    .single<WorkspaceNote>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateWorkspaceNote(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  noteId: string,
  input: NoteInput,
) {
  const { data, error } = await supabase
    .from("workspace_notes")
    .update({
      title: input.title?.trim() || "Untitled",
      body: input.body?.trim() ?? "",
      source: input.source?.trim() || "Manual",
      folder: input.folder?.trim() || "Funnel",
      tags: input.tags ?? [],
      visibility: input.visibility ?? "private",
      pinned: input.pinned ?? false,
      context_id: input.contextId ?? null,
      funnel_id: input.funnelId ?? null,
      step_id: input.stepId ?? null,
      asset_key: input.assetKey ?? null,
      builder_key: input.builderKey ?? null,
      ai_output_id: input.aiOutputId ?? null,
      inspiration_category: input.inspirationCategory ?? null,
      metadata: input.metadata ?? {},
      updated_by: user.id,
    })
    .eq("id", noteId)
    .eq("organization_id", organization.id)
    .select(noteSelect)
    .single<WorkspaceNote>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteWorkspaceNote(
  supabase: SupabaseClient,
  organization: Organization,
  noteId: string,
) {
  const { error } = await supabase
    .from("workspace_notes")
    .delete()
    .eq("id", noteId)
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }
}
