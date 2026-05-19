import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";

export type TenantContext = {
  supabase: SupabaseClient;
  user: User;
  tenant: {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
  };
  role: "owner" | "admin" | "member" | "viewer";
};

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: "Request could not be completed." },
      { status: 400 },
    );
  }

  return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
}

export async function requireTenantContext(
  supabase: SupabaseClient,
): Promise<TenantContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new HttpError("Authentication is required.", 401);
  }

  const tenant = await getOrCreateDefaultOrganization(supabase, user);
  const { data: membership, error } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle<{ role: TenantContext["role"] }>();

  if (error) {
    throw new HttpError("Workspace access could not be verified.", 403);
  }

  if (membership?.role) {
    return { supabase, user, tenant, role: membership.role };
  }

  const { data: legacyMembership, error: legacyError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle<{ role: TenantContext["role"] }>();

  if (legacyError) {
    throw new HttpError("Workspace access could not be verified.", 403);
  }

  if (!legacyMembership?.role) {
    throw new HttpError("Workspace access is required.", 403);
  }

  return { supabase, user, tenant, role: legacyMembership.role };
}

export function requireTenantAdmin(context: TenantContext) {
  if (context.role !== "owner" && context.role !== "admin") {
    throw new HttpError("Owner or admin access is required.", 403);
  }
}

export async function auditAction(
  context: TenantContext,
  action: string,
  input: {
    targetTable?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  await context.supabase.from("admin_audit_log").insert({
    tenant_id: context.tenant.id,
    actor_user_id: context.user.id,
    action,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
}
