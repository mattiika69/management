import "server-only";
import { createHash } from "crypto";
import { Resend } from "resend";
import { getServerEnv, requireServerEnv } from "@/lib/env/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanHeaderText(value: string) {
  return value.replace(/[\r\n<>]/g, "").trim();
}

export function getResend() {
  return new Resend(requireServerEnv("RESEND_API_KEY"));
}

export function getResendFromEmail() {
  const fromEmail = requireServerEnv("EMAIL_FROM");
  const inlineName = fromEmail.match(/^\s*(.*?)\s*<[^>]+>\s*$/)?.[1]?.trim();
  const fromName = getServerEnv("RESEND_FROM_NAME") || inlineName || "";
  const email = normalizeEmail(fromEmail);

  if (!email) {
    throw new Error("EMAIL_FROM must be a valid email address or Name <email@domain>.");
  }

  if (!fromName) return email;

  return `${cleanHeaderText(fromName)} <${email}>`;
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const email = (trimmed.match(/<([^>]+)>/)?.[1] ?? trimmed).trim().toLowerCase();
  return emailPattern.test(email) ? email : "";
}

export function normalizeEmailList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeEmail).filter(Boolean)));
}

export function resendIdempotencyKey(scope: string, ...parts: Array<string | null | undefined>) {
  const hash = createHash("sha256")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 32);

  return `${scope}/${hash}`;
}
