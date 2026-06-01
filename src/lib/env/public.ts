import {
  assertValidPublicEnv,
  PUBLIC_REQUIRED_ENV,
  readEnvVar,
  requireEnvVar,
  type EnvSource,
} from "@/lib/env/core";

export { PUBLIC_REQUIRED_ENV };

const publicEnv: EnvSource = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

export function getPublicEnv(name: string, env: EnvSource = publicEnv) {
  return readEnvVar(name, env);
}

export function requirePublicEnv(name: string, env: EnvSource = publicEnv) {
  return requireEnvVar(name, env, "public");
}

export function validatePublicRuntimeEnv(env: EnvSource = publicEnv) {
  assertValidPublicEnv(env);
}
