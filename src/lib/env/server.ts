import "server-only";
import {
  assertValidServerEnv,
  readEnvVar,
  requireEnvVar,
  SERVER_MANUAL_SETUP_ENV,
  SERVER_REQUIRED_ENV,
  type EnvSource,
} from "@/lib/env/core";

export { SERVER_MANUAL_SETUP_ENV, SERVER_REQUIRED_ENV };

export function getServerEnv(name: string, env?: EnvSource) {
  return readEnvVar(name, env);
}

export function requireServerEnv(name: string, env?: EnvSource) {
  return requireEnvVar(name, env, "server");
}

export function validateServerRuntimeEnv(env?: EnvSource) {
  assertValidServerEnv(env);
}
