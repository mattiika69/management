import "server-only";

import { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  isAuthBypassEnabled,
  isAuthBypassUser,
} from "@/lib/supabase/auth-bypass";

type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
};

type UserProfile = {
  metadata: Record<string, unknown> | null;
};

export const ACTIVE_ORGANIZATION_COOKIE = "hyperoptimal_active_tenant_id";

function defaultOrganizationName(user: User) {
  return user.email ? `${user.email.split("@")[0]}'s workspace` : "Personal workspace";
}

function defaultOrganizationSlug(user: User) {
  return `workspace-${user.id.slice(0, 8)}`;
}

async function activeOrganizationCookie() {
  try {
    return (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

async function activeOrganizationFromProfile(
  supabase: SupabaseClient,
  user: User,
) {
  const { data } = await supabase
    .from("user_profiles")
    .select("metadata")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>();

  const activeTenantId = data?.metadata?.active_tenant_id;
  return typeof activeTenantId === "string" ? activeTenantId : null;
}

async function findAccessibleOrganization(
  supabase: SupabaseClient,
  user: User,
  organizationId: string | null,
) {
  if (!organizationId) return null;

  const { data: tenantMembership, error: tenantError } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", organizationId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle<{ tenant_id: string }>();

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  const hasTenantMembership = Boolean(tenantMembership);

  const { data: legacyMembership, error: legacyError } = hasTenantMembership
    ? { data: null, error: null }
    : await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle<{ organization_id: string }>();

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  if (!hasTenantMembership && !legacyMembership) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,slug,owner_id")
    .eq("id", organizationId)
    .maybeSingle<Organization>();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  return organization;
}

export async function getOrCreateDefaultOrganization(
  supabase: SupabaseClient,
  user: User,
) {
  const bypassTenantId = process.env.AUTH_BYPASS_TENANT_ID?.trim();

  if (bypassTenantId && isAuthBypassEnabled() && isAuthBypassUser(user)) {
    const { data: bypassOrganization, error: bypassError } = await supabase
      .from("organizations")
      .select("id,name,slug,owner_id")
      .eq("id", bypassTenantId)
      .maybeSingle<Organization>();

    if (bypassError) {
      throw new Error(bypassError.message);
    }

    if (bypassOrganization) {
      return bypassOrganization;
    }
  }

  const activeCookieOrganization = await findAccessibleOrganization(
    supabase,
    user,
    await activeOrganizationCookie(),
  );

  if (activeCookieOrganization) {
    return activeCookieOrganization;
  }

  const activeProfileOrganization = await findAccessibleOrganization(
    supabase,
    user,
    await activeOrganizationFromProfile(supabase, user),
  );

  if (activeProfileOrganization) {
    return activeProfileOrganization;
  }

  const { data: tenantMembership, error: tenantMembershipError } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ tenant_id: string }>();

  if (tenantMembershipError) {
    throw new Error(tenantMembershipError.message);
  }

  const tenantMemberOrganization = await findAccessibleOrganization(
    supabase,
    user,
    tenantMembership?.tenant_id ?? null,
  );

  if (tenantMemberOrganization) {
    return tenantMemberOrganization;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization:organizations(id,name,slug,owner_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ organization: Organization | Organization[] | null }>();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const memberOrganization = Array.isArray(membership?.organization)
    ? membership?.organization[0]
    : membership?.organization;

  if (memberOrganization) {
    return memberOrganization;
  }

  const { data: ownedOrganization, error: ownedSelectError } = await supabase
    .from("organizations")
    .select("id,name,slug,owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Organization>();

  if (ownedSelectError) {
    throw new Error(ownedSelectError.message);
  }

  if (ownedOrganization) {
    return ownedOrganization;
  }

  const { data: createdOrganization, error: insertError } = await supabase
    .from("organizations")
    .insert({
      name: defaultOrganizationName(user),
      slug: defaultOrganizationSlug(user),
      owner_id: user.id,
    })
    .select("id,name,slug,owner_id")
    .single<Organization>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdOrganization;
}
