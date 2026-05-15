import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createAuthBypassClient,
  isAuthBypassEnabled,
} from "@/lib/supabase/auth-bypass";

export async function createClient() {
  const cookieStore = await cookies();

  if (isAuthBypassEnabled()) {
    return createAuthBypassClient();
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
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
