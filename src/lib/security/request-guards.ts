import "server-only";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function originFrom(value: string | null | undefined) {
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function configuredOrigins(request: Request) {
  const hostOrigin = originFrom(
    request.headers.get("host")
      ? `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`
      : "",
  );

  return new Set(
    [
      originFrom(request.url),
      hostOrigin,
      originFrom(process.env.NEXT_PUBLIC_SITE_URL),
      originFrom(
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "",
      ),
      originFrom(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""),
    ].filter(Boolean),
  );
}

export function enforceSameOrigin(request: Request) {
  const origin = originFrom(request.headers.get("origin"));
  if (!origin || !configuredOrigins(request).has(origin)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return null;
}

export function constantTimeEquals(actual: string | null | undefined, expected: string | null | undefined) {
  if (!actual || !expected) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
