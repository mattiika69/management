import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import {
  createWorkspaceNote,
  deleteWorkspaceNote,
  updateWorkspaceNote,
} from "@/lib/notes/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  id?: string;
  title?: string;
  body?: string;
  source?: string;
  folder?: string;
  tags?: string[];
  visibility?: "private" | "shared";
  pinned?: boolean;
  contextId?: string | null;
  context_id?: string | null;
  funnelId?: string | null;
  funnel_id?: string | null;
  stepId?: string | null;
  step_id?: string | null;
  assetKey?: string | null;
  asset_key?: string | null;
  builderKey?: string | null;
  builder_key?: string | null;
  aiOutputId?: string | null;
  ai_output_id?: string | null;
  inspirationCategory?: string | null;
  inspiration_category?: string | null;
  metadata?: Record<string, unknown>;
};

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Authentication is required." }, { status: 401 }) };
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  return { supabase, user, organization };
}

function cleanTags(tags: unknown) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function noteInput(payload: Payload) {
  return {
    ...payload,
    contextId: payload.contextId ?? payload.context_id ?? null,
    funnelId: payload.funnelId ?? payload.funnel_id ?? null,
    stepId: payload.stepId ?? payload.step_id ?? null,
    assetKey: payload.assetKey ?? payload.asset_key ?? null,
    builderKey: payload.builderKey ?? payload.builder_key ?? null,
    aiOutputId: payload.aiOutputId ?? payload.ai_output_id ?? null,
    inspirationCategory: payload.inspirationCategory ?? payload.inspiration_category ?? null,
    tags: cleanTags(payload.tags),
  };
}

export async function POST(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;

  const payload = (await request.json()) as Payload;
  const note = await createWorkspaceNote(context.supabase, context.organization, context.user, noteInput(payload));

  return NextResponse.json({ ok: true, note });
}

export async function PUT(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;

  const payload = (await request.json()) as Payload;
  const noteId = payload.id?.trim();
  if (!noteId) {
    return NextResponse.json({ error: "A note is required." }, { status: 400 });
  }

  const note = await updateWorkspaceNote(context.supabase, context.organization, context.user, noteId, noteInput(payload));

  return NextResponse.json({ ok: true, note });
}

export async function DELETE(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;

  const payload = (await request.json()) as Payload;
  const noteId = payload.id?.trim();
  if (!noteId) {
    return NextResponse.json({ error: "A note is required." }, { status: 400 });
  }

  await deleteWorkspaceNote(context.supabase, context.organization, noteId);
  return NextResponse.json({ ok: true });
}
