import { NextResponse } from "next/server";
import {
  archiveCompanyContext,
  createCompanyContext,
  getOrCreateCompanyContext,
  listCompanyContexts,
  updateCompanyContext,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";
import type { CompanyContextData } from "@/lib/hyperoptimal/data";

type Payload = {
  id?: string;
  title?: string;
  status?: "draft" | "confirmed";
  data?: CompanyContextData;
};

async function getRequestContext() {
  const context = await requireTenantContext(await createClient());
  return { supabase: context.supabase, user: context.user, organization: context.tenant };
}

export async function GET() {
  try {
    const context = await getRequestContext();
    const contexts = await listCompanyContexts(context.supabase, context.organization);
    return NextResponse.json({ contexts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const payload = (await request.json().catch(() => ({}))) as Payload;
    const created = await createCompanyContext(
      context.supabase,
      context.organization,
      context.user,
      { title: payload.title, data: payload.data, status: payload.status },
    );

    return NextResponse.json({ ok: true, context: created });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getRequestContext();
    const payload = (await request.json()) as Payload;
    const contextId = payload.id?.trim();
    if (!contextId) {
      return NextResponse.json({ error: "A context is required." }, { status: 400 });
    }

    const existing = await getOrCreateCompanyContext(context.supabase, context.organization, context.user, contextId);
    const updated = await updateCompanyContext(
      context.supabase,
      context.organization,
      context.user,
      payload.data ?? existing.data,
      contextId,
      payload.title,
      payload.status,
    );

    return NextResponse.json({ ok: true, context: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getRequestContext();
    const payload = (await request.json()) as Payload;
    const contextId = payload.id?.trim();
    if (!contextId) {
      return NextResponse.json({ error: "A context is required." }, { status: 400 });
    }

    await archiveCompanyContext(context.supabase, context.organization, context.user, contextId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
