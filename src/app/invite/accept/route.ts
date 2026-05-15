import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(new URL(`/invite/${encodeURIComponent(token)}`, request.url));
}
