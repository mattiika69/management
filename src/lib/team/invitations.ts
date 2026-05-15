import { createHash, randomBytes } from "crypto";

export type TeamRole = "admin" | "member";

export function isTeamRole(role: string): role is TeamRole {
  return role === "admin" || role === "member";
}

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInviteUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`;
}
