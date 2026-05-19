import { NextResponse } from "next/server";
import {
  RoezanSendResult,
  sendRoezanMessage,
} from "@/lib/roezan/server";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type SmsPayload = {
  phone?: string;
  message?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  media?: string[];
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRoezanResult(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "result" in error
  ) {
    return error.result as RoezanSendResult;
  }

  return null;
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  try {
    const payload = (await request.json()) as SmsPayload;
    const phone = payload.phone ? normalizePhone(payload.phone) : "";
    const message = payload.message?.trim();
    const firstName = payload.firstName?.trim().slice(0, 80) ?? "";
    const lastName = payload.lastName?.trim().slice(0, 80) ?? "";
    const email = payload.email?.trim().toLowerCase().slice(0, 254) ?? "";
    const media = Array.isArray(payload.media)
      ? payload.media.filter((url) => typeof url === "string").slice(0, 10)
      : [];

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required." },
        { status: 400 },
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
    }

    if (message.length > 1600) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    if (!isEmail(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
    const limit = checkRateLimit({
      key: rateLimitKey(["sms-send", context.tenant.id, context.user.id]),
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    const { data: smsMessage, error: insertError } = await context.supabase
      .from("sms_messages")
      .insert({
        organization_id: context.tenant.id,
        created_by: context.user.id,
        to_phone: phone,
        message,
        first_name: firstName,
        last_name: lastName,
        email,
        media_urls: media,
        metadata: { source: "api" },
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError) {
      return NextResponse.json(
        { error: "SMS could not be queued. Try again in a moment." },
        { status: 500 },
      );
    }

    try {
      const result = await sendRoezanMessage({
        phone,
        message,
        firstName,
        lastName,
        email,
        media,
      });

      const { error: updateError } = await context.supabase
        .from("sms_messages")
        .update({
          status: "sent",
          rate_limit_limit: result.rateLimit.limit,
          rate_limit_remaining: result.rateLimit.remaining,
          rate_limit_reset: result.rateLimit.reset,
          metadata: { source: "api", provider_status: "accepted" },
        })
        .eq("id", smsMessage.id);

      if (updateError) {
        return NextResponse.json(
          { error: "SMS was sent, but delivery status could not be saved." },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, rateLimit: result.rateLimit });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "SMS send failed.";
      const result = getRoezanResult(error);

      await context.supabase
        .from("sms_messages")
        .update({
          status: "failed",
          error_message: messageText,
          rate_limit_limit: result?.rateLimit.limit,
          rate_limit_remaining: result?.rateLimit.remaining,
          rate_limit_reset: result?.rateLimit.reset,
          metadata: { source: "api", provider_status: result ? "failed" : "unavailable", error: messageText },
        })
        .eq("id", smsMessage.id);

      return NextResponse.json(
        {
          error: "SMS could not be sent. Try again in a moment.",
          rateLimit: result?.rateLimit,
        },
        { status: result?.status ?? 500 },
      );
    }
  } catch (error) {
    return jsonError(error);
  }
}
