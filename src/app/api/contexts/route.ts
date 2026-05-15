import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import {
  archiveCompanyContext,
  createCompanyContext,
  getOrCreateCompanyContext,
  listCompanyContexts,
  updateCompanyContext,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";
import type { CompanyContextData } from "@/lib/hyperoptimal/data";

type Payload = {
  id?: string;
  title?: string;
  status?: "draft" | "confirmed";
  data?: CompanyContextData;
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

  const contexts = await listCompanyContexts(context.supabase, context.organization);
  return NextResponse.json({ contexts });
}

export async function POST(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const payload = (await request.json().catch(() => ({}))) as Payload;
  const created = await createCompanyContext(
    context.supabase,
    context.organization,
    context.user,
    { title: payload.title, data: payload.data, status: payload.status },
  );

  return NextResponse.json({ ok: true, context: created });
}

export async function PATCH(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

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
}

export async function DELETE(request: Request) {
  const context = await getRequestContext();
  if ("error" in context) return context.error;

  const payload = (await request.json()) as Payload;
  const contextId = payload.id?.trim();
  if (!contextId) {
    return NextResponse.json({ error: "A context is required." }, { status: 400 });
  }

  await archiveCompanyContext(context.supabase, context.organization, context.user, contextId);
  return NextResponse.json({ ok: true });
}
