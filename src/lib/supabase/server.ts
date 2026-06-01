import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createAuthBypassClient,
  isAuthBypassEnabled,
} from "@/lib/supabase/auth-bypass";
import { requirePublicEnv } from "@/lib/env/public";

async function createCookieClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies, but middleware/routes can.
          }
        },
      },
    },
  );
}

export async function createClient() {
  if (isAuthBypassEnabled()) {
    const sessionClient = await createCookieClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (user) {
      return sessionClient;
    }

    return createAuthBypassClient();
  }

  return createCookieClient();
}

export async function createSessionClient() {
  return createCookieClient();
}
