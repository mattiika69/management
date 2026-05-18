import "server-only";
import { Resend } from "resend";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanHeaderText(value: string) {
  return value.replace(/[\r\n<>]/g, "").trim();
}

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

export function getResendFromEmail() {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not configured.");
  }

  const fromName = process.env.RESEND_FROM_NAME?.trim();
  const email = normalizeEmail(fromEmail);

  if (!email) {
    throw new Error("RESEND_FROM_EMAIL is not a valid email address.");
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
