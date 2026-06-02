import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createAuthBypassClient,
  isAuthBypassEnabled,
} from "@/lib/supabase/auth-bypass";
import { requirePublicEnv } from "@/lib/env/public";

type CookieSessionOptions = {
  keepLoggedIn?: boolean;
};

const persistentSessionMaxAge = 60 * 60 * 24 * 60;

function sessionCookieOptions<T extends { expires?: Date; maxAge?: number }>(
  options: T,
  input: CookieSessionOptions,
): T {
  if (input.keepLoggedIn === undefined) return options;

  const nextOptions = { ...options };
  if (input.keepLoggedIn) {
    nextOptions.maxAge = persistentSessionMaxAge;
    nextOptions.expires = new Date(Date.now() + persistentSessionMaxAge * 1000);
    return nextOptions;
  }

  delete nextOptions.maxAge;
  delete nextOptions.expires;
  return nextOptions;
}

async function createCookieClient(input: CookieSessionOptions = {}) {
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
              cookieStore.set(name, value, sessionCookieOptions(options, input));
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

export async function createSessionClient(input: CookieSessionOptions = {}) {
  return createCookieClient(input);
}
