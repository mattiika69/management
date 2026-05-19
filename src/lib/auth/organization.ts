import "server-only";

import { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
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

function slugifyOrganizationName(name: string, user: User) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || defaultOrganizationSlug(user)}-${user.id.slice(0, 8)}`;
}

async function setActiveOrganizationMetadata(
  supabase: SupabaseClient,
  user: User,
  organizationId: string,
) {
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("metadata")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>();

  const metadata = {
    ...(existingProfile?.metadata ?? {}),
    active_tenant_id: organizationId,
  };

  await supabase
    .from("user_profiles")
    .update({
      email: user.email ?? null,
      display_name:
        (user.user_metadata?.name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        null,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
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
  _supabase: SupabaseClient,
  user: User,
  organizationId: string | null,
) {
  if (!organizationId) return null;

  // Server-only service-role reads avoid recursive RLS policy failures while
  // still enforcing membership against the authenticated user before any data
  // is returned to the app.
  const admin = createAdminClient();

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id,name,slug,owner_id")
    .eq("id", organizationId)
    .maybeSingle<Organization>();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if (!organization) return null;
  if (organization.owner_id === user.id) return organization;

  const { data: tenantMembership, error: tenantError } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", organizationId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle<{ tenant_id: string }>();

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  if (tenantMembership) return organization;

  const { data: legacyMembership, error: legacyError } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle<{ organization_id: string }>();

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  return legacyMembership ? organization : null;
}

export async function getCurrentOrganization(
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

  const admin = createAdminClient();

  const { data: tenantMembership, error: tenantMembershipError } = await admin
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

  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ organization_id: string }>();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const memberOrganization = await findAccessibleOrganization(
    supabase,
    user,
    membership?.organization_id ?? null,
  );

  if (memberOrganization) {
    return memberOrganization;
  }

  const { data: ownedOrganization, error: ownedSelectError } = await admin
    .from("organizations")
    .select("id,name,slug,owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Organization>();

  if (ownedSelectError) {
    throw new Error(ownedSelectError.message);
  }

  return ownedOrganization ?? null;
}

export async function getOrCreateDefaultOrganization(
  supabase: SupabaseClient,
  user: User,
) {
  const ownedOrganization = await getCurrentOrganization(supabase, user);
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

export async function bootstrapSignupOrganization(
  supabase: SupabaseClient,
  user: User,
) {
  const metadata = user.user_metadata ?? {};
  if (metadata.onboarding_bootstrap !== "new_organization") {
    return getCurrentOrganization(supabase, user);
  }

  const currentOrganization = await getCurrentOrganization(supabase, user);
  if (currentOrganization) {
    await setActiveOrganizationMetadata(supabase, user, currentOrganization.id);
    return currentOrganization;
  }

  const organizationName =
    typeof metadata.onboarding_organization_name === "string" && metadata.onboarding_organization_name.trim()
      ? metadata.onboarding_organization_name.trim()
      : typeof metadata.organization_name === "string" && metadata.organization_name.trim()
        ? metadata.organization_name.trim()
        : defaultOrganizationName(user);

  const { data: createdOrganization, error: insertError } = await supabase
    .from("organizations")
    .insert({
      name: organizationName,
      slug: slugifyOrganizationName(organizationName, user),
      owner_id: user.id,
    })
    .select("id,name,slug,owner_id")
    .single<Organization>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  await supabase.from("tenant_memberships").upsert({
    tenant_id: createdOrganization.id,
    user_id: user.id,
    role: "owner",
    archived_at: null,
    updated_at: new Date().toISOString(),
  });

  await setActiveOrganizationMetadata(supabase, user, createdOrganization.id);
  return createdOrganization;
}
