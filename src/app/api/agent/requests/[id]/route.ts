import { NextResponse } from "next/server";
import {
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { data, error } = await context.supabase
      .from("agent_requests")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ request: data });
  } catch (error) {
    return jsonError(error);
  }
}
