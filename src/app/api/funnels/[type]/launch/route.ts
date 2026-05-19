import { NextResponse } from "next/server";
import {
  BOOK_A_CALL_LAUNCH_ASSETS,
  BUILDER_OPTIONS,
  DEFAULT_COMPANY_CONTEXT,
  companyContextToText,
  isBookACallAssetKey,
  isBuilderKey,
  type BuilderKey,
  type CompanyContextData,
  type LaunchAssetDefinition,
} from "@/lib/hyperoptimal/data";
import { getFunnelById, normalizeCompanyContext, type TrainingRow } from "@/lib/hyperoptimal/server";
import { formatLearningsForPrompt, type LearningItem } from "@/lib/learnings/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type RouteContext = {
  params: Promise<{ type: string }>;
};

type Payload = {
  assetKeys?: string[];
  builderKey?: string;
  builderProjectUrl?: string;
};

type StepRow = {
  id: string;
  step_key: string;
  title: string;
  notes: string;
  metadata: Record<string, unknown>;
};

type ContextRow = {
  id: string;
  title: string;
  status: "draft" | "confirmed" | "archived";
  data: CompanyContextData;
};

type DefinitionRow = {
  agent_id: string;
  title: string;
  default_prompt: string;
  default_criteria: string[];
};

function anthropicMaxTokens() {
  const parsed = Number(process.env.ANTHROPIC_MAX_TOKENS || 5000);
  if (!Number.isFinite(parsed) || parsed < 1) return 5000;
  return Math.min(Math.floor(parsed), 8192);
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const content = Array.isArray((payload as Record<string, unknown>).content)
    ? ((payload as Record<string, unknown>).content as unknown[])
    : [];
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
        "You generate production-ready workspace assets for HyperOptimal Management. Use the provided AI Context Document and Learnings for every recommendation. Return polished, client-ready assets.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error("AI generation failed.");
  }

  const body = await response.json().catch(() => null);
  return extractResponseText(body) || null;
}

function builderLabel(builderKey: BuilderKey) {
  return BUILDER_OPTIONS.find((builder) => builder.key === builderKey)?.promptLabel ?? "selected builder";
}

function buildPrompt(input: {
  asset: LaunchAssetDefinition;
  definition: DefinitionRow;
  context: ContextRow;
  funnelName: string;
  builderKey: BuilderKey;
  builderProjectUrl: string;
  step?: StepRow;
  training?: TrainingRow | null;
  developerTraining: string[];
  learningItems: string[];
}) {
  const criteria = input.definition.default_criteria.map((item) => `- ${item}`).join("\n");
  const companyText = companyContextToText(input.context.data);
  return [
    `# ${input.asset.title} Launch Package`,
    `Funnel: ${input.funnelName}`,
    `Context: ${input.context.title}`,
    `Builder: ${builderLabel(input.builderKey)}`,
    input.builderProjectUrl ? `Builder Project URL: ${input.builderProjectUrl}` : "",
    "",
    "Create a production-ready deliverable for this exact asset. Include clearly labeled sections for final copy, workflow steps, review checklist, and any links or placeholders the team needs.",
    input.asset.key === "lead_magnet"
      ? "For the lead magnet, include the core promise, outline, delivery format, opt-in page tie-in, and follow-up handoff."
      : "",
    input.asset.key === "vsl"
      ? "For the VSL, include both the spoken VSL script and a slide-by-slide outline."
      : "",
    input.asset.key === "application_form"
      ? "For the application form, include form page copy, question list, field types, qualification logic, and routing notes."
      : "",
    input.asset.key === "unqualified_page"
      ? "For the unqualified page, include respectful redirect copy, downsell/nurture options, and next-step links."
      : "",
    input.asset.key === "breakout_videos"
      ? "For breakout videos, include a VSL-style video and slide-based variants, clearly labeled."
      : "",
    input.asset.key === "opt_in_page"
      ? "For the opt-in page, keep it simple and centered on a lead magnet."
      : "",
    input.asset.key === "welcome_flow"
      ? "For the welcome flow, include message timing, subject lines or message labels, body copy, and CTA for the booked-call path."
      : "",
    input.asset.key === "sales_call_plan"
      ? "For the sales call plan, include opener, agenda, discovery questions, pitch flow, objections, close, and post-call handoff."
      : "",
    input.step?.notes ? `## Funnel Row Notes\n${input.step.notes}` : "",
    input.training?.overall_description ? `## Customer Training\n${input.training.overall_description}` : "",
    input.training?.framework ? `## Customer Framework\n${input.training.framework}` : "",
    input.training?.criteria ? `## Customer Criteria\n${input.training.criteria}` : "",
    input.training?.ai_sequence ? `## Customer Sequence\n${input.training.ai_sequence}` : "",
    input.developerTraining.length ? `## Workspace Training\n${input.developerTraining.join("\n\n")}` : "",
    input.learningItems.length ? `## Learnings\n${input.learningItems.join("\n\n")}` : "## Learnings\nNo learnings have been saved yet.",
    criteria ? `## Default Criteria\n${criteria}` : "",
    `## Default AI Prompt\n${input.definition.default_prompt}`,
    companyText ? `## AI Context\n${companyText}` : "## AI Context\nNo context content was saved.",
  ].filter(Boolean).join("\n\n");
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { type: funnelId } = await params;
    const payload = (await request.json().catch(() => ({}))) as Payload;
  const requestedAssetKeys = Array.isArray(payload.assetKeys)
    ? payload.assetKeys.filter(isBookACallAssetKey)
    : BOOK_A_CALL_LAUNCH_ASSETS.map((asset) => asset.key);
  const assets = BOOK_A_CALL_LAUNCH_ASSETS.filter((asset) => requestedAssetKeys.includes(asset.key));

  if (!assets.length) {
    return NextResponse.json({ error: "Select at least one asset to launch." }, { status: 400 });
  }

    const tenantContext = await requireTenantContext(await createClient());
    const organization = tenantContext.tenant;
    const user = tenantContext.user;
    const supabase = tenantContext.supabase;
    const funnel = await getFunnelById(supabase, organization, funnelId);
  if (!funnel || funnel.template_key !== "book-a-call") {
    return NextResponse.json({ error: "A valid workspace is required." }, { status: 404 });
  }

  if (!funnel.context_id) {
    return NextResponse.json({ error: "Link a confirmed AI Context Doc before launching." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: linkedContext, error: contextError } = await admin
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("id", funnel.context_id)
    .eq("organization_id", organization.id)
    .is("archived_at", null)
    .maybeSingle<ContextRow>();

  if (contextError) {
    return NextResponse.json({ error: "The linked AI Context Doc could not be loaded." }, { status: 400 });
  }
  if (!linkedContext || linkedContext.status !== "confirmed") {
    return NextResponse.json({ error: "Confirm the linked AI Context Doc before launching." }, { status: 400 });
  }

  const builderKey = payload.builderKey && isBuilderKey(payload.builderKey)
    ? payload.builderKey
    : funnel.builder_key;
  const builderProjectUrl = payload.builderProjectUrl?.trim() ?? funnel.builder_project_url;
  const estimatedCredits = assets.reduce((sum, asset) => sum + asset.creditCost, 0);

  const { data: account } = await admin
    .from("credit_accounts")
    .select("id,balance_credits")
    .eq("organization_id", organization.id)
    .maybeSingle<{ id: string; balance_credits: number }>();
  const balance = account?.balance_credits ?? 0;
  if (balance < estimatedCredits) {
    return NextResponse.json(
      { error: `Insufficient credits. Required: ${estimatedCredits}. Available: ${balance}.` },
      { status: 402 },
    );
  }

  const { data: launchRun, error: launchError } = await admin
    .from("funnel_launch_runs")
    .insert({
      organization_id: organization.id,
      funnel_id: funnel.id,
      context_id: linkedContext.id,
      builder_key: builderKey,
      builder_project_url: builderProjectUrl,
      selected_assets: assets.map((asset) => asset.key),
      status: "running",
      estimated_credits: estimatedCredits,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (launchError) {
    return NextResponse.json({ error: "Launch could not be started." }, { status: 500 });
  }

  const { data: steps } = await admin
    .from("funnel_steps")
    .select("id,step_key,title,notes,metadata")
    .eq("funnel_id", funnel.id)
    .eq("organization_id", organization.id)
    .returns<StepRow[]>();
  const stepByKey = new Map((steps ?? []).map((step) => [step.step_key, step]));
  const results: Array<{ assetKey: string; status: string; noteId?: string; error?: string }> = [];
  let spentCredits = 0;

  for (const asset of assets) {
    const step = stepByKey.get(asset.stepKey);
    const { data: assetRun, error: assetRunError } = await admin
      .from("funnel_asset_runs")
      .insert({
        organization_id: organization.id,
        launch_run_id: launchRun.id,
        funnel_id: funnel.id,
        context_id: linkedContext.id,
        step_id: step?.id ?? null,
        asset_key: asset.key,
        agent_id: asset.agentId,
        status: "running",
        credit_cost: asset.creditCost,
      })
      .select("id")
      .single<{ id: string }>();

    if (assetRunError) {
      results.push({ assetKey: asset.key, status: "failed", error: "Asset could not be started." });
      continue;
    }

    try {
      const { data: definition } = await admin
        .from("pre_made_ai_definitions")
        .select("agent_id,title,default_prompt,default_criteria")
        .eq("agent_id", asset.agentId)
        .single<DefinitionRow>();
      if (!definition) throw new Error("AI definition is missing.");

      const { data: training } = await admin
        .from("workspace_ai_training")
        .select("id,organization_id,agent_id,overall_description,framework,criteria,ai_sequence,training_refs,updated_at")
        .eq("organization_id", organization.id)
        .eq("agent_id", asset.agentId)
        .maybeSingle<TrainingRow>();
      const { data: developerTraining } = await admin
        .from("developer_ai_training")
        .select("instructions")
        .eq("agent_id", asset.agentId)
        .in("builder_key", ["all", builderKey]);
      const { data: learningItems } = await admin
        .from("funnel_learning_items")
        .select("title,body")
        .eq("organization_id", organization.id)
        .eq("funnel_type", "book-a-call")
        .order("updated_at", { ascending: false })
        .limit(10);
      const { data: workspaceLearnings } = await admin
        .from("learning_items")
        .select("id,title,body,category")
        .eq("tenant_id", organization.id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(20)
        .returns<Array<Pick<LearningItem, "id" | "title" | "body" | "category">>>();
      const prompt = buildPrompt({
        asset,
        definition,
          context: { ...linkedContext, data: normalizeCompanyContext(linkedContext.data ?? DEFAULT_COMPANY_CONTEXT) },
        funnelName: funnel.name,
        builderKey,
        builderProjectUrl,
        step,
        training,
        developerTraining: (developerTraining ?? []).map((row) => row.instructions).filter(Boolean),
        learningItems: [
          formatLearningsForPrompt(workspaceLearnings ?? []),
          ...(learningItems ?? []).map((row) => `### ${row.title}\n${row.body}`),
        ].filter(Boolean),
      });
      const generated = await generateWithClaude(prompt);
      const outputText = generated || prompt;
      const status = generated ? "generated" : "saved";

      const { data: output, error: outputError } = await admin
        .from("funnel_ai_outputs")
        .insert({
          organization_id: organization.id,
          funnel_id: funnel.id,
          step_id: step?.id ?? null,
          context_id: linkedContext.id,
          asset_key: asset.key,
          builder_key: builderKey,
          agent_id: asset.agentId,
          prompt,
          output_text: outputText,
          status,
          created_by: user.id,
          launch_run_id: launchRun.id,
          asset_run_id: assetRun.id,
          metadata: {
            source: "launch",
            builderProjectUrl,
            learningItemIds: (workspaceLearnings ?? []).map((item) => item.id),
            liveProviderConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
            model:
              process.env.CLAUDE_MODEL?.trim() ||
              process.env.ANTHROPIC_MODEL?.trim() ||
              "claude-sonnet-4-5",
          },
        })
        .select("id")
        .single<{ id: string }>();
      if (outputError) throw new Error("Generated asset could not be saved.");

      const { data: note, error: noteError } = await admin
        .from("workspace_notes")
        .insert({
          organization_id: organization.id,
          title: `${funnel.name} - ${asset.title}`,
          body: outputText,
          source: "Launch",
          folder: asset.noteFolder,
          tags: ["generated", "book-a-call", asset.key, builderKey],
          visibility: "private",
          context_id: linkedContext.id,
          funnel_id: funnel.id,
          step_id: step?.id ?? null,
          asset_key: asset.key,
          builder_key: builderKey,
          ai_output_id: output.id,
          metadata: {
            launchRunId: launchRun.id,
            assetRunId: assetRun.id,
            builderProjectUrl,
            learningItemIds: (workspaceLearnings ?? []).map((item) => item.id),
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single<{ id: string }>();
      if (noteError) throw new Error("Generated note could not be saved.");

      const { error: spendError } = await admin.rpc("spend_credits", {
        target_organization_id: organization.id,
        amount_to_spend: asset.creditCost,
        target_funnel_id: funnel.id,
        target_launch_run_id: launchRun.id,
        target_asset_run_id: assetRun.id,
        entry_external_id: `asset:${assetRun.id}`,
        entry_metadata: { assetKey: asset.key, aiOutputId: output.id, noteId: note.id },
        actor_user_id: user.id,
      });
      if (spendError) throw new Error("Credits could not be recorded.");

      spentCredits += asset.creditCost;
      await admin.from("funnel_ai_outputs").update({ note_id: note.id }).eq("id", output.id);
      await admin
        .from("funnel_asset_runs")
        .update({ status: "completed", ai_output_id: output.id, note_id: note.id })
        .eq("id", assetRun.id);
      if (step) {
        await admin
          .from("funnel_steps")
          .update({
            status: "done",
            metadata: {
              ...(step.metadata ?? {}),
              generatedNoteId: note.id,
              builderKey,
              builderProjectUrl,
            },
          })
          .eq("id", step.id);
      }
      results.push({ assetKey: asset.key, status: "completed", noteId: note.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Asset launch failed.";
      await admin
        .from("funnel_asset_runs")
        .update({ status: "failed", error_message: message })
        .eq("id", assetRun.id);
      results.push({ assetKey: asset.key, status: "failed", error: message });
    }
  }

  const failed = results.some((result) => result.status === "failed");
  await admin
    .from("funnel_launch_runs")
    .update({
      status: failed ? "failed" : "completed",
      spent_credits: spentCredits,
      error_message: failed ? "One or more assets failed." : null,
    })
    .eq("id", launchRun.id);
  await admin
    .from("funnels")
    .update({
      status: failed ? "launching" : "launched",
      builder_key: builderKey,
      builder_project_url: builderProjectUrl,
      updated_by: user.id,
    })
    .eq("id", funnel.id);

    return NextResponse.json({ ok: !failed, launchRunId: launchRun.id, spentCredits, results });
  } catch (error) {
    return jsonError(error);
  }
}
