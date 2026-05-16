import type { SupabaseClient, User } from "@supabase/supabase-js";

export type WorkspacePerson = {
  key: string;
  userId: string | null;
  name: string;
  role: string;
  initials: string;
};

export const DEFAULT_OPERATIONS_PEOPLE: WorkspacePerson[] = [
  { key: "carla-bm", userId: null, name: "Carla BM", role: "Team Member", initials: "C" },
  { key: "kamal-testing", userId: null, name: "Kamal Testing", role: "Team Member", initials: "K" },
  { key: "m-s", userId: null, name: "M S", role: "Owner", initials: "M" },
  { key: "matas-j", userId: null, name: "Matas J", role: "Team Member", initials: "M" },
  { key: "matthew-larsen", userId: null, name: "Matthew Larsen", role: "Owner", initials: "M" },
  { key: "sauliusl-tvar", userId: null, name: "Sauliusl Tvar", role: "Team Member", initials: "S" },
  { key: "team", userId: null, name: "team", role: "Owner", initials: "T" },
];

export const CHECKLIST_PERSON_ORDER = [
  "carla-bm",
  "kamal-testing",
  "m-s",
  "matas-j",
  "matthew-larsen",
  "sauliusl-tvar",
  "team",
];

export const RATING_PERSON_ORDER = [
  "sauliusl-tvar",
  "kamal-testing",
  "matthew-larsen",
  "m-s",
  "matas-j",
  "carla-bm",
  "team",
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "H";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "H";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function orderPeople(people: WorkspacePerson[], order: string[]) {
  const index = new Map(order.map((key, position) => [key, position]));
  return [...people].sort((a, b) => {
    const aIndex = index.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = index.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.name.localeCompare(b.name);
  });
}

function personFromProfile(input: {
  userId: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
}) {
  const name =
    input.displayName?.trim() ||
    input.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    `User ${input.userId.slice(0, 6)}`;

  return {
    key: slugify(name) || `user-${input.userId}`,
    userId: input.userId,
    name,
    role: input.role === "owner" ? "Owner" : input.role === "admin" ? "Admin" : "Team Member",
    initials: initialsFor(name),
  };
}

export async function listWorkspacePeople(
  supabase: SupabaseClient,
  tenantId: string,
  currentUser: User,
) {
  const people = new Map<string, WorkspacePerson>();

  const { data: employees } = await supabase
    .from("employees")
    .select("id,user_id,full_name,role_title,email,employment_status")
    .eq("tenant_id", tenantId)
    .is("archived_at", null)
    .neq("employment_status", "inactive")
    .order("full_name", { ascending: true })
    .returns<Array<{
      id: string;
      user_id: string | null;
      full_name: string;
      role_title: string;
      email: string | null;
      employment_status: string;
    }>>();

  for (const employee of employees ?? []) {
    const key = slugify(employee.full_name) || `employee-${employee.id}`;
    people.set(key, {
      key,
      userId: employee.user_id,
      name: employee.full_name,
      role: employee.role_title || "Team Member",
      initials: initialsFor(employee.full_name),
    });
  }

  if (!people.size) {
    for (const person of DEFAULT_OPERATIONS_PEOPLE) {
      people.set(person.key, person);
    }
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id,role")
    .eq("tenant_id", tenantId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .returns<Array<{ user_id: string; role: string }>>();

  const userIds = (memberships ?? []).map((membership) => membership.user_id);
  const profilesByUserId = new Map<string, { email: string | null; display_name: string | null }>();

  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id,email,display_name")
      .in("user_id", userIds)
      .returns<Array<{ user_id: string; email: string | null; display_name: string | null }>>();

    for (const profile of profiles ?? []) {
      profilesByUserId.set(profile.user_id, {
        email: profile.email,
        display_name: profile.display_name,
      });
    }
  }

  for (const membership of memberships ?? []) {
    const profile = profilesByUserId.get(membership.user_id);
    const person = personFromProfile({
      userId: membership.user_id,
      role: membership.role,
      email: membership.user_id === currentUser.id ? currentUser.email : profile?.email,
      displayName:
        profile?.display_name ||
        (membership.user_id === currentUser.id
          ? (currentUser.user_metadata?.name as string | undefined)
          : undefined),
    });
    if (!people.has(person.key)) people.set(person.key, person);
  }

  return Array.from(people.values());
}
