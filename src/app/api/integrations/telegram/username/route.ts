import { NextResponse } from "next/server";
import { normalizeTelegramUsername } from "@/lib/integrations/telegram-username";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { auditAction, HttpError, jsonError, requireTenantContext } from "@/lib/tenant-context";

type TelegramConnectionRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  config: Record<string, unknown> | null;
};

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function PATCH(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    const body = await request.json() as {
      connectionId?: unknown;
      username?: unknown;
    };

    const connectionId = typeof body.connectionId === "string" ? body.connectionId.trim() : "";
    const username = normalizeTelegramUsername(body.username);

    if (!connectionId) {
      throw new HttpError("Choose a Telegram connection.", 400);
    }

    if (!username) {
      throw new HttpError("Enter a valid Telegram username.", 400);
    }

    const admin = createAdminClient();
    const { data: connection, error: findError } = await admin
      .from("integration_connections")
      .select("id,organization_id,created_by,config")
      .eq("id", connectionId)
      .eq("organization_id", context.tenant.id)
      .eq("provider", "telegram")
      .is("revoked_at", null)
      .maybeSingle<TelegramConnectionRow>();

    if (findError) {
      throw new HttpError(findError.message, 400);
    }

    if (!connection) {
      throw new HttpError("Telegram connection not found.", 404);
    }

    const canUpdate =
      context.role === "owner" ||
      context.role === "admin" ||
      connection.created_by === context.user.id;

    if (!canUpdate) {
      throw new HttpError("You can only update your own Telegram connection.", 403);
    }

    const config = {
      ...readObject(connection.config),
      telegram_username: username,
    };

    const { error: updateError } = await admin
      .from("integration_connections")
      .update({
        display_name: username,
        config,
      })
      .eq("id", connection.id);

    if (updateError) {
      throw new HttpError(updateError.message, 400);
    }

    await auditAction(
      { ...context, supabase: admin },
      "integration.telegram.username_updated",
      {
        targetTable: "integration_connections",
        targetId: connection.id,
        metadata: { username },
      },
    );

    return NextResponse.json({ ok: true, username });
  } catch (error) {
    return jsonError(error);
  }
}
