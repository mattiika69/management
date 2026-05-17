import "server-only";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
};

export type AdminSession = {
  admin: SupabaseClient;
  user: User;
  profile: AdminProfile;
};

export class AdminAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

async function loadAdminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AdminAccessError("Authentication is required.", 401);
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("user_id,email,display_name,is_admin")
    .eq("user_id", user.id)
    .maybeSingle<AdminProfile>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.is_admin) {
    throw new AdminAccessError("Admin access is required.", 403);
  }

  return { admin, user, profile };
}

export async function requireAdmin(next = "/admin") {
  try {
    void next;
    return await loadAdminSession();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      notFound();
    }

    throw error;
  }
}

export async function requireAdminForApi() {
  return loadAdminSession();
}

export function adminJsonError(error: unknown) {
  if (error instanceof AdminAccessError) {
    return NextResponse.json(
      { error: error.status === 401 ? "Authentication is required." : "Forbidden." },
      { status: error.status },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
}
