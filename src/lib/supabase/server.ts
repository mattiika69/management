import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createAuthBypassClient,
  isAuthBypassEnabled,
} from "@/lib/supabase/auth-bypass";

async function createCookieClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
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
