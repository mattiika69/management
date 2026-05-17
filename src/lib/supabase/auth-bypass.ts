import { randomBytes } from "crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_BYPASS_EMAIL = "auth-bypass@hyperoptimal-management.test";

function readBypassEmail() {
  return (
    process.env.AUTH_BYPASS_EMAIL?.trim().toLowerCase() ||
    DEFAULT_BYPASS_EMAIL
  );
}

export function isAuthBypassEnabled() {
  // Temporary product bypass: login is intentionally disabled.
  return true;
}

async function findUserByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    if (user) return user;
    if (data.users.length < 1000) break;
  }

  return null;
}

async function getOrCreateBypassUser(supabase: SupabaseClient) {
  const bypassUserId = process.env.AUTH_BYPASS_USER_ID?.trim();
  if (bypassUserId) {
    const { data, error } = await supabase.auth.admin.getUserById(bypassUserId);
    if (error) throw new Error(error.message);
    if (data.user) return data.user;
  }

  const email = readBypassEmail();
  const existing = await findUserByEmail(supabase, email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: randomBytes(36).toString("base64url"),
    email_confirm: true,
    user_metadata: {
      name: process.env.AUTH_BYPASS_NAME?.trim() || "Auth Bypass User",
      auth_bypass: true,
    },
  });

  if (error) {
    const raced = await findUserByEmail(supabase, email);
    if (raced) return raced;
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Auth bypass user could not be created.");
  }

  return data.user;
}

export async function createAuthBypassClient() {
  const supabase = createAdminClient();
  const user = await getOrCreateBypassUser(supabase);

  supabase.auth.getUser = (async () => ({
    data: { user: user as User },
    error: null,
  })) as typeof supabase.auth.getUser;

  return supabase;
}
