import { SupabaseClient, User } from "@supabase/supabase-js";

type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
};

function defaultOrganizationName(user: User) {
  return user.email ? `${user.email.split("@")[0]}'s workspace` : "Personal workspace";
}

function defaultOrganizationSlug(user: User) {
  return `workspace-${user.id.slice(0, 8)}`;
}

export async function getOrCreateDefaultOrganization(
  supabase: SupabaseClient,
  user: User,
) {
  const bypassTenantId = process.env.AUTH_BYPASS_TENANT_ID?.trim();

  if (bypassTenantId) {
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
