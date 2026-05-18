import { SupabaseClient, User } from "@supabase/supabase-js";

type Membership = {
  role: string;
};

export async function getMembershipRole(
  supabase: SupabaseClient,
  organizationId: string,
  user: User,
) {
  const { data: tenantMembership, error: tenantError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", organizationId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle<Membership>();

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  if (tenantMembership?.role) {
    return tenantMembership.role;
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle<Membership>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.role ?? "member";
}

export function canManageTeam(role: string) {
  return role === "owner" || role === "admin";
}
