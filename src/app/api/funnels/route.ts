import { NextResponse } from "next/server";
import { isBuilderKey } from "@/lib/hyperoptimal/data";
import {
  archiveFunnel,
  createFunnel,
  listFunnels,
  updateFunnel,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

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
  const context = await requireTenantContext(await createClient());
  return { supabase: context.supabase, user: context.user, organization: context.tenant };
}

export async function GET() {
  try {
    const context = await getRequestContext();
    const funnels = await listFunnels(context.supabase, context.organization, "book-a-call");
    return NextResponse.json({ funnels });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
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
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getRequestContext();
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
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getRequestContext();
    const payload = (await request.json()) as Payload;
    const funnelId = payload.id?.trim();
    if (!funnelId) {
      return NextResponse.json({ error: "A funnel is required." }, { status: 400 });
    }

    await archiveFunnel(context.supabase, context.organization, context.user, funnelId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
