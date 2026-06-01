export type EnvSource = Record<string, string | undefined>;

export const ENV_ALIASES = {
  NEXT_PUBLIC_APP_URL: ["NEXT_PUBLIC_SITE_URL"],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  STRIPE_PRICE_BASIC: ["STRIPE_ONBOARDING_PRICE_ID", "STRIPE_PRICE_ID"],
  EMAIL_FROM: ["RESEND_FROM_EMAIL"],
} as const;

export const PUBLIC_REQUIRED_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
] as const;

export const SERVER_REQUIRED_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASIC",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

export const SERVER_MANUAL_SETUP_ENV = [
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_BUSINESS",
] as const;

export const REQUIRED_ENV_CHECKLIST = [
  ...PUBLIC_REQUIRED_ENV,
  ...SERVER_REQUIRED_ENV,
  ...SERVER_MANUAL_SETUP_ENV,
] as const;

export class EnvConfigurationError extends Error {
  readonly missing: string[];
  readonly invalid: string[];

  constructor(message: string, input?: { missing?: string[]; invalid?: string[] }) {
    super(message);
    this.name = "EnvConfigurationError";
    this.missing = input?.missing ?? [];
    this.invalid = input?.invalid ?? [];
  }
}

function aliasesFor(name: string) {
  return ENV_ALIASES[name as keyof typeof ENV_ALIASES] ?? [];
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim() || "";
}

export function envNamesFor(name: string) {
  return [name, ...aliasesFor(name)];
}

export function readEnvVar(name: string, env: EnvSource = process.env) {
  for (const envName of envNamesFor(name)) {
    const value = cleanEnvValue(env[envName]);
    if (value) return value;
  }

  return "";
}

export function missingEnvVars(
  names: readonly string[],
  env: EnvSource = process.env,
) {
  return names.filter((name) => !readEnvVar(name, env));
}

function describeEnvName(name: string) {
  const aliases = aliasesFor(name);
  if (!aliases.length) return name;
  return `${name} (or ${aliases.join(" / ")})`;
}

export function requireEnvVar(
  name: string,
  env: EnvSource = process.env,
  scope = "runtime",
) {
  const value = readEnvVar(name, env);
  if (value) return value;

  throw new EnvConfigurationError(
    `Missing required ${scope} environment variable: ${describeEnvName(name)}.`,
    { missing: [name] },
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePublicEnv(
  env: EnvSource = process.env,
  required: readonly string[] = PUBLIC_REQUIRED_ENV,
) {
  const missing = missingEnvVars(required, env);
  const invalid: string[] = [];

  for (const name of required) {
    const value = readEnvVar(name, env);
    if (!value) continue;

    if (name.endsWith("_URL") && !isHttpUrl(value)) {
      invalid.push(name);
    }

    if (name === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" && !value.startsWith("pk_")) {
      invalid.push(name);
    }
  }

  return { missing, invalid };
}

export function assertValidPublicEnv(
  env: EnvSource = process.env,
  required: readonly string[] = PUBLIC_REQUIRED_ENV,
) {
  const result = validatePublicEnv(env, required);
  if (!result.missing.length && !result.invalid.length) return;

  const parts = [];
  if (result.missing.length) {
    parts.push(`missing ${result.missing.map(describeEnvName).join(", ")}`);
  }
  if (result.invalid.length) {
    parts.push(`invalid ${result.invalid.join(", ")}`);
  }

  throw new EnvConfigurationError(
    `Public environment configuration is incomplete: ${parts.join("; ")}.`,
    result,
  );
}

export function validateServerEnv(
  env: EnvSource = process.env,
  required: readonly string[] = SERVER_REQUIRED_ENV,
) {
  const missing = missingEnvVars(required, env);
  const invalid = required.filter((name) => name.startsWith("NEXT_PUBLIC_"));
  return { missing, invalid };
}

export function assertValidServerEnv(
  env: EnvSource = process.env,
  required: readonly string[] = SERVER_REQUIRED_ENV,
) {
  const result = validateServerEnv(env, required);
  if (!result.missing.length && !result.invalid.length) return;

  const parts = [];
  if (result.missing.length) {
    parts.push(`missing ${result.missing.map(describeEnvName).join(", ")}`);
  }
  if (result.invalid.length) {
    parts.push(`server-only keys cannot be NEXT_PUBLIC_: ${result.invalid.join(", ")}`);
  }

  throw new EnvConfigurationError(
    `Server environment configuration is incomplete: ${parts.join("; ")}.`,
    result,
  );
}

export function providerSetupReport(env: EnvSource = process.env) {
  return REQUIRED_ENV_CHECKLIST.map((name) => ({
    name,
    configured: Boolean(readEnvVar(name, env)),
    aliases: aliasesFor(name),
    manual: (SERVER_MANUAL_SETUP_ENV as readonly string[]).includes(name),
  }));
}
