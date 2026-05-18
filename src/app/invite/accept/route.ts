import { NextResponse } from "next/server";

function tokenFromPath(value: string | null) {
  if (!value) return null;
  const parts = value.split("/").filter(Boolean);
  const inviteIndex = parts.findIndex((part) => part === "invite");
  if (inviteIndex >= 0 && parts[inviteIndex + 1]) {
    return parts[inviteIndex + 1];
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ||
    url.searchParams.get("invite_token") ||
    tokenFromPath(url.searchParams.get("next")) ||
    tokenFromPath(url.searchParams.get("redirect_to")) ||
    tokenFromPath(url.searchParams.get("redirectTo"));

  if (!token) {
    return NextResponse.redirect(new URL("/login?notice=invite-link-invalid", request.url));
  }

  const redirectUrl = new URL(`/invite/${encodeURIComponent(token)}`, request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (code) redirectUrl.searchParams.set("code", code);
  if (error) redirectUrl.searchParams.set("error", error);

  return NextResponse.redirect(redirectUrl);
}
