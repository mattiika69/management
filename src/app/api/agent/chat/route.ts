import { NextResponse } from "next/server";
import { handleAgentConversation } from "@/lib/agent/conversation";
import { createClient } from "@/lib/supabase/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";

type Payload = {
  message?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const payload = (await request.json()) as Payload;
    const message = text(payload.message);
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const result = await handleAgentConversation({
      supabase: context.supabase,
      organizationId: context.tenant.id,
      actorUserId: context.user.id,
      provider: "web",
      message,
      sourceLabel: "App",
      sourceUserId: context.user.id,
    });

    if (result.savedLearning) {
      await auditAction(context, "agent.learning.saved", {
        targetTable: "learning_items",
        targetId: result.savedLearning.id,
      });
    }

    return NextResponse.json({
      response: result.text,
      status: result.status,
      savedLearning: result.savedLearning
        ? {
            id: result.savedLearning.id,
            title: result.savedLearning.title,
            body: result.savedLearning.body,
            category: result.savedLearning.category,
            source_provider: result.savedLearning.source_provider,
            source_label: result.savedLearning.source_label,
            updated_at: result.savedLearning.updated_at,
          }
        : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
