import "server-only";
import { NextResponse } from "next/server";
import { EnvConfigurationError } from "@/lib/env/core";

export function envErrorResponse(error: unknown) {
  if (!(error instanceof EnvConfigurationError)) return null;

  return NextResponse.json({ error: error.message }, { status: 500 });
}
