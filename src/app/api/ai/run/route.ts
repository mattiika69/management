import { NextResponse } from "next/server";
import { isFunnelType } from "@/lib/hyperoptimal/data";
import {
  buildAIOutputText,
  getAIDefinitions,
  getOrCreateCompanyContext,
  type TrainingRow,
} from "@/lib/hyperoptimal/server";
import { formatLearningsForPrompt, getLearningItems } from "@/lib/learnings/server";
import { createWorkspaceNote } from "@/lib/notes/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type Payload = {
  funnelType?: string;
  funnelId?: string;
  stepId?: string;
  agentId?: string;
};

type StepRow = {
  id: string;
  funnel_id: string;
  title: string;
  notes: string;
  ai_agent_id: string | null;
};

function anthropicMaxTokens() {
  const parsed = Number(process.env.ANTHROPIC_MAX_TOKENS || 4000);
  if (!Number.isFinite(parsed) || parsed < 1) return 4000;
  return Math.min(Math.floor(parsed), 8192);
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const content = Array.isArray(record.content) ? record.content : [];
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const raw = item as Record<string, unknown>;
      return raw.type === "text" && typeof raw.text === "string" ? raw.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

async function generateWithClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        process.env.CLAUDE_MODEL?.trim() ||
        process.env.ANTHROPIC_MODEL?.trim() ||
        "claude-sonnet-4-5",
      max_tokens: anthropicMaxTokens(),
      system:
        "You are generating production-ready assets for HyperOptimal Management. Use only the provided AI Context Document, Learnings, selected step, and training criteria. Return concise, directly usable copy.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error("AI generation failed.");
  }

  const body = await response.json().catch(() => null);
  return extractResponseText(body) || null;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const funnelType = payload.funnelType?.trim() ?? "";
    const funnelId = payload.funnelId?.trim();
    const stepId = payload.stepId?.trim();
    const agentId = payload.agentId?.trim();

    if (!isFunnelType(funnelType) || !funnelId || !agentId) {
      return NextResponse.json({ error: "A valid funnel and agent are required." }, { status: 400 });
    }

    const context = await requireTenantContext(await createClient());
    const organization = context.tenant;
    const user = context.user;
    const supabase = context.supabase;
    const definitions = await getAIDefinitions(supabase, funnelType);
    const definition = definitions.find((entry) => entry.agent_id === agentId);

    if (!definition) {
      return NextResponse.json({ error: "This AI is not approved for this funnel." }, { status: 400 });
    }

    const { data: step, error: stepError } = stepId
      ? await supabase
          .from("funnel_steps")
          .select("id,funnel_id,title,notes,ai_agent_id")
          .eq("id", stepId)
          .eq("funnel_id", funnelId)
          .eq("organization_id", organization.id)
          .maybeSingle<StepRow>()
      : { data: null, error: null };

    if (stepError) {
      return NextResponse.json(
        { error: "The selected funnel step could not be loaded." },
        { status: 400 },
      );
    }

    if (step && step.ai_agent_id && step.ai_agent_id !== agentId) {
      return NextResponse.json({ error: "This AI does not match the selected funnel step." }, { status: 400 });
    }

    const { data: training } = await supabase
      .from("workspace_ai_training")
      .select("id,organization_id,agent_id,overall_description,framework,criteria,ai_sequence,training_refs,updated_at")
      .eq("organization_id", organization.id)
      .eq("agent_id", agentId)
      .maybeSingle<TrainingRow>();
    const companyContext = await getOrCreateCompanyContext(supabase, organization, user);
    const learnings = await getLearningItems(supabase, organization, 20);
    const prompt = buildAIOutputText({
      agentTitle: definition.title,
      agentPrompt: definition.default_prompt,
      criteria: definition.default_criteria,
      companyContext: companyContext.data,
      stepTitle: step?.title,
      stepNotes: step?.notes,
      training: training ?? undefined,
      learnings: formatLearningsForPrompt(learnings),
    });

    let outputText = prompt;
    let status: "saved" | "generated" | "failed" = "saved";
    let errorMessage: string | null = null;

    try {
      const generated = await generateWithClaude(prompt);
      if (generated) {
        outputText = generated;
        status = "generated";
      }
    } catch {
      status = "failed";
      errorMessage = "AI generation failed.";
      outputText = `${prompt}\n\n## Generation Status\nAI generation failed. The source prompt was saved for manual review.`;
    }

    const { data: saved, error: saveError } = await supabase
      .from("funnel_ai_outputs")
      .insert({
        organization_id: organization.id,
        funnel_id: funnelId,
        step_id: step?.id ?? null,
        context_id: companyContext.id,
        asset_key: step?.id ? step.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") : agentId,
        agent_id: agentId,
        prompt,
        output_text: outputText,
        status,
        error_message: errorMessage,
        created_by: user.id,
        metadata: {
          funnelType,
          provider: "anthropic",
          model:
            process.env.CLAUDE_MODEL?.trim() ||
            process.env.ANTHROPIC_MODEL?.trim() ||
            "claude-sonnet-4-5",
          liveProviderConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
          learningItemIds: learnings.map((item) => item.id),
        },
      })
      .select("id,status")
      .single<{ id: string; status: string }>();

    if (saveError) {
      return NextResponse.json({ error: "AI output could not be saved." }, { status: 500 });
    }

    const note = await createWorkspaceNote(supabase, organization, user, {
      title: `${step?.title ?? definition.title} - AI Output`,
      body: outputText,
      source: "Pre-Made AI",
      folder: "Generated Assets",
      tags: ["generated", "manual-ai", agentId],
      visibility: "private",
      contextId: companyContext.id,
      funnelId,
      stepId: step?.id ?? null,
      assetKey: step?.id ? step.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") : agentId,
      aiOutputId: saved.id,
      metadata: {
        source: "manual-ai-run",
        provider: "anthropic",
        learningItemIds: learnings.map((item) => item.id),
      },
    });
    await supabase.from("funnel_ai_outputs").update({ note_id: note.id }).eq("id", saved.id);

    return NextResponse.json({ ok: true, outputId: saved.id, noteId: note.id, status: saved.status });
  } catch (error) {
    return jsonError(error);
  }
}
