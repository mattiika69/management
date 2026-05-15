import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { INSPIRATION_CATEGORIES, isInspirationCategory } from "@/lib/hyperoptimal/data";
import { createWorkspaceNote } from "@/lib/notes/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  title?: string;
  body?: string;
  category?: string;
  funnelId?: string | null;
  contextId?: string | null;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;
  const body = payload.body?.trim() ?? "";
  const category = payload.category?.trim() ?? "general";

  if (!body || !isInspirationCategory(category)) {
    return NextResponse.json(
      { error: `Inspiration requires content and one category: ${INSPIRATION_CATEGORIES.join(", ")}.` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const note = await createWorkspaceNote(supabase, organization, user, {
    title: payload.title?.trim() || `${category} inspiration`,
    body,
    source: "Inspiration",
    folder: "Inspiration",
    tags: ["inspiration", category],
    visibility: "private",
    contextId: payload.contextId ?? null,
    funnelId: payload.funnelId ?? null,
    inspirationCategory: category,
    metadata: { source: "inspiration-page" },
  });

  return NextResponse.json({ ok: true, note });
}
