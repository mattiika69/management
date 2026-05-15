import { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_COMPANY_CONTEXT,
  FUNNEL_DEFINITIONS,
  INSPIRATION_CATEGORIES,
  companyContextToText,
  isInspirationCategory,
  type CompanyContextData,
} from "@/lib/hyperoptimal/data";
import {
  normalizeCompanyContext,
  type FunnelStepRow,
} from "@/lib/hyperoptimal/server";
import type { IntegrationConnection } from "./connections";

type CommandResult = {
  command: string;
  text: string;
  status?: "saved" | "sent" | "failed" | "ignored";
};

const HELP_TEXT = [
  "HyperOptimal Funnel commands:",
  "/company - read the latest confirmed AI Context Doc summary",
  "/book_a_call - read Book-a-Call Funnel status",
  "/outputs - read recent AI outputs",
  `/inspiration ${INSPIRATION_CATEGORIES.join("|")} Your example - save inspiration to Notes`,
  "/set company companyName Example Co - update one AI Context Doc field",
  "/set book-a-call opt_in_page url https://example.com - update one funnel step field",
].join("\n");

function normalizeCommand(text: string) {
  return text
    .replace(/^<@[A-Z0-9]+>\s*/i, "")
    .replace(/^\/sm\s+/i, "")
    .replace(/^\//, "")
    .trim();
}

function canonicalFunnelToken(value: string) {
  return value.replace(/_/g, "-").toLowerCase();
}

type CommandFunnelRow = {
  id: string;
  organization_id: string;
  template_key: "book-a-call";
  name: string;
};

type CommandContextRow = {
  id: string;
  title: string;
  status: "draft" | "confirmed" | "archived";
  data: CompanyContextData;
};

async function loadCompanyContext(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data: confirmed, error: confirmedError } = await supabase
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("organization_id", organizationId)
    .eq("status", "confirmed")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<CommandContextRow[]>();

  if (confirmedError) throw new Error(confirmedError.message);
  if (confirmed?.[0]) {
    return { ...confirmed[0], data: normalizeCompanyContext(confirmed[0].data) };
  }

  const { data, error } = await supabase
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<CommandContextRow[]>();

  if (error) throw new Error(error.message);
  return data?.[0] ? { ...data[0], data: normalizeCompanyContext(data[0].data) } : null;
}

async function upsertCompanyContextField(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  field: string,
  value: string,
) {
  if (!(field in DEFAULT_COMPANY_CONTEXT)) {
    return `Unknown AI Company Document field: ${field}`;
  }

  const existing = await loadCompanyContext(supabase, connection.organization_id);
  const data = { ...(existing?.data ?? DEFAULT_COMPANY_CONTEXT), [field]: value };
  const payload = {
    organization_id: connection.organization_id,
    data,
    updated_by: connection.created_by,
    created_by: connection.created_by,
  };

  const { error } = existing
    ? await supabase
        .from("company_contexts")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("company_contexts").insert(payload);

  if (error) throw new Error(error.message);
  return `Saved ${field} to the AI Company Document.`;
}

async function ensureFunnelForCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  funnelType: "book-a-call",
) {
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const { data: existing, error: selectError } = await supabase
    .from("funnels")
    .select("id,organization_id,template_key,name")
    .eq("organization_id", connection.organization_id)
    .eq("template_key", funnelType)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<CommandFunnelRow[]>();
  if (selectError) throw new Error(selectError.message);

  let funnel = existing?.[0] ?? null;
  if (!funnel) {
    const { data: created, error: insertError } = await supabase
      .from("funnels")
      .insert({
        organization_id: connection.organization_id,
        template_key: funnelType,
        name: definition.name,
        builder_key: "lovable",
        created_by: connection.created_by,
        updated_by: connection.created_by,
      })
      .select("id,organization_id,template_key,name")
      .single<CommandFunnelRow>();
    if (insertError) throw new Error(insertError.message);
    funnel = created;
  }

  const { data: existingSteps, error: stepsError } = await supabase
    .from("funnel_steps")
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .eq("funnel_id", funnel.id)
    .order("step_order", { ascending: true })
    .returns<FunnelStepRow[]>();
  if (stepsError) throw new Error(stepsError.message);

  const existingKeys = new Set((existingSteps ?? []).map((step) => step.step_key));
  const missing = definition.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !existingKeys.has(step.key));
  if (missing.length) {
    const { error } = await supabase.from("funnel_steps").insert(
      missing.map(({ step, index }) => ({
        organization_id: connection.organization_id,
        funnel_id: funnel.id,
        step_key: step.key,
        step_order: index + 1,
        title: step.title,
        ai_agent_id: step.agentId,
      })),
    );
    if (error) throw new Error(error.message);
  }

  const { data: steps, error: finalError } = await supabase
    .from("funnel_steps")
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .eq("funnel_id", funnel.id)
    .order("step_order", { ascending: true })
    .returns<FunnelStepRow[]>();
  if (finalError) throw new Error(finalError.message);

  return { funnel, steps: steps ?? [] };
}

function formatFunnelStatus(funnelType: "book-a-call", steps: FunnelStepRow[]) {
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const done = steps.filter((step) => step.status === "done").length;
  return [
    `${definition.name}: ${done}/${steps.length} complete`,
    "",
    ...steps.map((step) => {
      const url = step.url ? ` | ${step.url}` : "";
      const assigned = step.assigned_to ? ` | DRI: ${step.assigned_to}` : "";
      const note = step.metadata?.generatedNoteUrl ? ` | note: ${step.metadata.generatedNoteUrl}` : "";
      return `${step.step_order}. ${step.title}: ${step.status}${assigned}${url}${note}`;
    }),
  ].join("\n");
}

async function updateFunnelField(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  funnelType: "book-a-call",
  stepKey: string,
  field: string,
  value: string,
) {
  const { steps } = await ensureFunnelForCommand(supabase, connection, funnelType);
  const step = steps.find((candidate) => candidate.step_key === stepKey);
  if (!step) return `Unknown ${funnelType} step: ${stepKey}`;

  const normalizedField = field === "dri" ? "assigned_to" : field;
  if (!["status", "url", "notes", "assigned_to"].includes(normalizedField)) {
    return "Use one of these funnel step fields: status, url, notes, assigned_to, dri.";
  }
  if (normalizedField === "status" && !["not_started", "in_progress", "done"].includes(value)) {
    return "Status must be not_started, in_progress, or done.";
  }

  const { error } = await supabase
    .from("funnel_steps")
    .update({ [normalizedField]: value })
    .eq("id", step.id)
    .eq("organization_id", connection.organization_id);
  if (error) throw new Error(error.message);
  return `Saved ${step.title} ${normalizedField}.`;
}

async function saveInspirationFromCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  rawCategory: string,
  body: string,
) {
  const category = rawCategory.replace(/_/g, "-").toLowerCase();
  if (!isInspirationCategory(category)) {
    return `Unknown inspiration category. Use one of: ${INSPIRATION_CATEGORIES.join(", ")}.`;
  }
  const trimmed = body.trim();
  if (!trimmed) {
    return "Add the inspiration text after the category.";
  }
  const title = `${category} inspiration - ${new Date().toLocaleDateString()}`;
  const { error } = await supabase.from("workspace_notes").insert({
    organization_id: connection.organization_id,
    title,
    body: trimmed,
    source: connection.provider === "slack" ? "Slack" : "Telegram",
    folder: "Inspiration",
    tags: ["inspiration", category, connection.provider],
    visibility: "private",
    inspiration_category: category,
    created_by: connection.created_by,
    updated_by: connection.created_by,
    metadata: { source: "channel", provider: connection.provider },
  });
  if (error) throw new Error(error.message);
  return `Saved ${category} inspiration to Notes.`;
}

async function formatOutputs(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from("funnel_ai_outputs")
    .select("agent_id,asset_key,status,note_id,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  if (!data?.length) return "No AI outputs saved yet.";
  return [
    "Recent AI outputs",
    ...data.map((row) => {
      const note = row.note_id ? ` | /notes?note=${row.note_id}` : "";
      return `${row.asset_key ?? row.agent_id}: ${row.status} (${new Date(row.created_at).toLocaleString()})${note}`;
    }),
  ].join("\n");
}

export async function handleHyperoptimalCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  rawText: string,
): Promise<CommandResult> {
  const text = normalizeCommand(rawText);
  if (!text || text === "help") return { command: "help", text: HELP_TEXT };

  const lower = text.toLowerCase();

  if (lower === "company" || lower === "ai-company" || lower === "ai_company") {
    const context = await loadCompanyContext(supabase, connection.organization_id);
    const summary = companyContextToText(context?.data ?? DEFAULT_COMPANY_CONTEXT);
    return { command: "company", text: summary || "No AI Company Document content saved yet." };
  }

  const funnelToken = canonicalFunnelToken(text);
  if (funnelToken === "book-a-call") {
    const { steps } = await ensureFunnelForCommand(supabase, connection, "book-a-call");
    return { command: "book-a-call", text: formatFunnelStatus("book-a-call", steps) };
  }

  if (lower === "book a call" || lower === "book-a-call funnel" || lower === "book_a_call") {
    const { steps } = await ensureFunnelForCommand(supabase, connection, "book-a-call");
    return { command: "book-a-call", text: formatFunnelStatus("book-a-call", steps) };
  }

  if (lower === "outputs") {
    return { command: "outputs", text: await formatOutputs(supabase, connection.organization_id) };
  }

  if (lower.startsWith("run ")) {
    return {
      command: "run",
      text: "Paid launches can only be started inside the app in V1. Use /outputs to fetch saved assets.",
      status: "ignored",
    };
  }

  const inspirationMatch = text.match(/^(?:save\s+)?inspiration\s+(\S+)\s+([\s\S]+)$/i);
  if (inspirationMatch) {
    return {
      command: "inspiration",
      text: await saveInspirationFromCommand(supabase, connection, inspirationMatch[1], inspirationMatch[2]),
      status: "saved",
    };
  }

  if (lower.startsWith("set company ")) {
    const match = text.match(/^set\s+company\s+(\S+)\s+([\s\S]+)$/i);
    if (!match) return { command: "set_company", text: "Use `/set company companyName Example Co`." };
    return {
      command: "set_company",
      text: await upsertCompanyContextField(supabase, connection, match[1], match[2].trim()),
    };
  }

  if (lower.startsWith("set ")) {
    const match = text.match(/^set\s+(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]+)$/i);
    if (!match) {
      return {
        command: "set_funnel",
        text: "Use `/set book-a-call opt_in_page url https://example.com`.",
      };
    }
    const funnelType = canonicalFunnelToken(match[1]);
    if (funnelType !== "book-a-call") {
      return { command: "set_funnel", text: "V1 only supports Book-a-Call funnel commands." };
    }
    return {
      command: "set_funnel",
      text: await updateFunnelField(supabase, connection, "book-a-call", match[2], match[3], match[4].trim()),
    };
  }

  return {
    command: "help",
    text: `Message saved to the integration log. No app data was changed because this was not an explicit command.\n\n${HELP_TEXT}`,
    status: "ignored",
  };
}
