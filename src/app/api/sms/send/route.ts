import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
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

  const payload = (await request.json()) as SmsPayload;
  const phone = payload.phone ? normalizePhone(payload.phone) : "";
  const message = payload.message?.trim();
  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const media = Array.isArray(payload.media) ? payload.media.slice(0, 10) : [];

  if (!phone || !message) {
    return NextResponse.json(
      { error: "Phone and message are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const limit = checkRateLimit({
    key: rateLimitKey(["sms-send", organization.id, user.id]),
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const { data: smsMessage, error: insertError } = await supabase
    .from("sms_messages")
    .insert({
      organization_id: organization.id,
      created_by: user.id,
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

    const { error: updateError } = await supabase
      .from("sms_messages")
      .update({
        status: "sent",
        rate_limit_limit: result.rateLimit.limit,
        rate_limit_remaining: result.rateLimit.remaining,
        rate_limit_reset: result.rateLimit.reset,
        metadata: { source: "api", provider_response: result.data },
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

    await supabase
      .from("sms_messages")
      .update({
        status: "failed",
        error_message: messageText,
        rate_limit_limit: result?.rateLimit.limit,
        rate_limit_remaining: result?.rateLimit.remaining,
        rate_limit_reset: result?.rateLimit.reset,
        metadata: { source: "api", provider_response: result?.data, error: messageText },
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
}
