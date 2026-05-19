import { NextResponse } from "next/server";
import {
  normalizeCompanyContext,
  updateCompanyContext,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  id?: string;
  title?: string;
  status?: "draft" | "confirmed";
  data?: unknown;
};

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const context = await requireTenantContext(await createClient());
    const updated = await updateCompanyContext(
      context.supabase,
      context.tenant,
      context.user,
      normalizeCompanyContext(payload.data),
      payload.id,
      payload.title,
      payload.status,
    );

    return NextResponse.json({ ok: true, context: updated, updatedAt: updated.updated_at });
  } catch (error) {
    return jsonError(error);
  }
}
