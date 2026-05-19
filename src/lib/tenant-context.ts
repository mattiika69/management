import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getCurrentOrganization } from "@/lib/auth/organization";

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

  const tenant = await getCurrentOrganization(supabase, user);
  if (!tenant) {
    throw new HttpError("Workspace access is required.", 403);
  }

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

function normalizeUserIds(userIds: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      userIds
        .map((userId) => (typeof userId === "string" ? userId.trim() : ""))
        .filter(Boolean),
    ),
  );
}

export async function requireTenantMemberUserIds(
  context: TenantContext,
  userIds: Array<string | null | undefined>,
) {
  const uniqueUserIds = normalizeUserIds(userIds);
  if (!uniqueUserIds.length) return;

  const { data: tenantMemberships, error: tenantError } = await context.supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", context.tenant.id)
    .in("user_id", uniqueUserIds)
    .is("archived_at", null)
    .returns<Array<{ user_id: string }>>();

  if (tenantError) {
    throw new HttpError("Workspace membership could not be verified.", 403);
  }

  const verifiedUserIds = new Set((tenantMemberships ?? []).map((row) => row.user_id));
  const missingFromTenant = uniqueUserIds.filter((userId) => !verifiedUserIds.has(userId));
  if (!missingFromTenant.length) return;

  const { data: legacyMemberships, error: legacyError } = await context.supabase
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", context.tenant.id)
    .in("user_id", missingFromTenant)
    .returns<Array<{ user_id: string }>>();

  if (legacyError) {
    throw new HttpError("Workspace membership could not be verified.", 403);
  }

  for (const row of legacyMemberships ?? []) {
    verifiedUserIds.add(row.user_id);
  }

  if (uniqueUserIds.some((userId) => !verifiedUserIds.has(userId))) {
    throw new HttpError("One or more selected people are not in this workspace.", 400);
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
