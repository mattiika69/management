import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { isBuilderKey } from "@/lib/hyperoptimal/data";
import {
  archiveFunnel,
  createFunnel,
  listFunnels,
  updateFunnel,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  id?: string;
  name?: string;
  contextId?: string | null;
  builderKey?: string;
  builderProjectUrl?: string;
  duplicateFromId?: string;
  status?: "draft" | "ready" | "launching" | "launched";
};

async function getRequestContext() {
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

export async function GET() {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const funnels = await listFunnels(context.supabase, context.organization, "book-a-call");
  return NextResponse.json({ funnels });
}

export async function POST(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const payload = (await request.json().catch(() => ({}))) as Payload;
  const builderKey = payload.builderKey && isBuilderKey(payload.builderKey) ? payload.builderKey : undefined;
  const result = await createFunnel(context.supabase, context.organization, context.user, {
    name: payload.name,
    contextId: payload.contextId,
    builderKey,
    builderProjectUrl: payload.builderProjectUrl,
    duplicateFromId: payload.duplicateFromId,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function PATCH(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const payload = (await request.json()) as Payload;
  const funnelId = payload.id?.trim();
  if (!funnelId) {
    return NextResponse.json({ error: "A funnel is required." }, { status: 400 });
  }

  const builderKey = payload.builderKey && isBuilderKey(payload.builderKey) ? payload.builderKey : undefined;
  const funnel = await updateFunnel(context.supabase, context.organization, context.user, funnelId, {
    name: payload.name,
    contextId: payload.contextId,
    builderKey,
    builderProjectUrl: payload.builderProjectUrl,
    status: payload.status,
  });

  return NextResponse.json({ ok: true, funnel });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const payload = (await request.json()) as Payload;
  const funnelId = payload.id?.trim();
  if (!funnelId) {
    return NextResponse.json({ error: "A funnel is required." }, { status: 400 });
  }

  await archiveFunnel(context.supabase, context.organization, context.user, funnelId);
  return NextResponse.json({ ok: true });
}
