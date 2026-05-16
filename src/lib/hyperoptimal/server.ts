import { SupabaseClient, User } from "@supabase/supabase-js";
import {
  AI_DEFINITIONS,
  DEFAULT_COMPANY_CONTEXT,
  DEFAULT_LEARNING_ITEMS,
  FUNNEL_DEFINITIONS,
  FunnelStatus,
  FunnelType,
  isBuilderKey,
  companyContextToText,
  type BuilderKey,
  type CompanyContextData,
} from "./data";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
};

export type CompanyContextRow = {
  id: string;
  organization_id: string;
  title: string;
  status: "draft" | "confirmed" | "archived";
  data: CompanyContextData;
  confirmed_at: string | null;
  archived_at: string | null;
  updated_at: string;
};

export type FunnelRow = {
  id: string;
  organization_id: string;
  template_key: FunnelType;
  name: string;
  context_id: string | null;
  builder_key: BuilderKey;
  builder_project_url: string;
  tech_stack: Record<string, unknown>;
  status: "draft" | "ready" | "launching" | "launched" | "archived";
  archived_at: string | null;
};

export type FunnelStepRow = {
  id: string;
  organization_id: string;
  funnel_id: string;
  step_key: string;
  step_order: number;
  title: string;
  status: FunnelStatus;
  url: string;
  notes: string;
  assigned_to: string;
  ai_agent_id: string | null;
  metadata: {
    techStackName?: string;
    techStackUrl?: string;
    exampleUrl?: string;
    generatedNoteId?: string;
    generatedNoteUrl?: string;
  };
  updated_at: string;
};

export type AIDefinitionRow = {
  agent_id: string;
  title: string;
  funnel_types: FunnelType[];
  description: string;
  default_prompt: string;
  default_criteria: string[];
};

export type TrainingRow = {
  id: string;
  organization_id: string;
  agent_id: string;
  overall_description: string;
  framework: string;
  criteria: string;
  ai_sequence: string;
  training_refs: Array<{ label?: string; url?: string }>;
  updated_at: string;
};

export type LearningItemRow = {
  id: string;
  organization_id: string;
  funnel_type: FunnelType;
  section: "learning" | "training";
  item_type: "learning" | "training" | "assignment";
  item_order: number;
  title: string;
  body: string;
};

export type AIOutputRow = {
  id: string;
  agent_id: string;
  output_text: string;
  status: "saved" | "generated" | "failed";
  created_at: string;
  metadata: Record<string, unknown>;
};

export type CreditAccountRow = {
  id: string;
  organization_id: string;
  balance_credits: number;
  lifetime_credits_purchased: number;
  lifetime_credits_spent: number;
};

export function normalizeCompanyContext(value: unknown): CompanyContextData {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  return Object.fromEntries(
    Object.keys(DEFAULT_COMPANY_CONTEXT).map((key) => [
      key,
      typeof raw[key] === "string" ? raw[key] : "",
    ]),
  );
}

async function selectCompanyContext(
  supabase: SupabaseClient,
  organizationId: string,
  contextId?: string,
) {
  let query = supabase
    .from("company_contexts")
    .select("id,organization_id,title,status,data,confirmed_at,archived_at,updated_at")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (contextId) {
    query = query.eq("id", contextId);
  }

  const { data, error } = await query.returns<CompanyContextRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0] ?? null;
  return row
    ? { ...row, data: normalizeCompanyContext(row.data) }
    : null;
}

export async function listCompanyContexts(
  supabase: SupabaseClient,
  organization: Organization,
) {
  const { data, error } = await supabase
    .from("company_contexts")
    .select("id,organization_id,title,status,data,confirmed_at,archived_at,updated_at")
    .eq("organization_id", organization.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .returns<CompanyContextRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, data: normalizeCompanyContext(row.data) }));
}

export async function getOrCreateCompanyContext(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  contextId?: string,
) {
  const existing = await selectCompanyContext(supabase, organization.id, contextId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("company_contexts")
    .insert({
      organization_id: organization.id,
      title: "AI Context Doc",
      data: DEFAULT_COMPANY_CONTEXT,
      status: "draft",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id,organization_id,title,status,data,confirmed_at,archived_at,updated_at")
    .single<CompanyContextRow>();

  if (error) {
    const raced = await selectCompanyContext(supabase, organization.id, contextId);
    if (raced) return raced;
    throw new Error(error.message);
  }

  return { ...data, data: normalizeCompanyContext(data.data) };
}

export async function createCompanyContext(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  input?: { title?: string; data?: CompanyContextData; status?: "draft" | "confirmed" },
) {
  const status = input?.status ?? "draft";
  const { data, error } = await supabase
    .from("company_contexts")
    .insert({
      organization_id: organization.id,
      title: input?.title?.trim() || "AI Context Doc",
      data: normalizeCompanyContext(input?.data ?? DEFAULT_COMPANY_CONTEXT),
      status,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id,organization_id,title,status,data,confirmed_at,archived_at,updated_at")
    .single<CompanyContextRow>();

  if (error) throw new Error(error.message);
  return { ...data, data: normalizeCompanyContext(data.data) };
}

export async function updateCompanyContext(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  data: CompanyContextData,
  contextId?: string,
  title?: string,
  status?: "draft" | "confirmed",
) {
  const normalized = normalizeCompanyContext(data);
  const existing = await getOrCreateCompanyContext(supabase, organization, user, contextId);
  const { data: updated, error } = await supabase
    .from("company_contexts")
    .update({
      data: normalized,
      ...(title !== undefined ? { title: title.trim() || "AI Context Doc" } : {}),
      ...(status ? { status, confirmed_at: status === "confirmed" ? new Date().toISOString() : existing.confirmed_at } : {}),
      updated_by: user.id,
    })
    .eq("id", existing.id)
    .eq("organization_id", organization.id)
    .select("id,organization_id,title,status,data,confirmed_at,archived_at,updated_at")
    .single<CompanyContextRow>();

  if (error) {
    throw new Error(error.message);
  }

  return { ...updated, data: normalizeCompanyContext(updated.data) };
}

export async function archiveCompanyContext(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  contextId: string,
) {
  const { error } = await supabase
    .from("company_contexts")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", contextId)
    .eq("organization_id", organization.id);

  if (error) throw new Error(error.message);
}

const funnelSelect =
  "id,organization_id,template_key,name,context_id,builder_key,builder_project_url,tech_stack,status,archived_at";

export function normalizeFunnelRow(row: FunnelRow): FunnelRow {
  const builderKey = typeof row.builder_key === "string" && isBuilderKey(row.builder_key)
    ? row.builder_key
    : "lovable";
  return {
    ...row,
    builder_key: builderKey,
    builder_project_url: row.builder_project_url ?? "",
    tech_stack: row.tech_stack && typeof row.tech_stack === "object" ? row.tech_stack : {},
    status: row.status ?? "draft",
    archived_at: row.archived_at ?? null,
  };
}

export async function listFunnels(
  supabase: SupabaseClient,
  organization: Organization,
  funnelType: FunnelType = "book-a-call",
) {
  const { data, error } = await supabase
    .from("funnels")
    .select(funnelSelect)
    .eq("organization_id", organization.id)
    .eq("template_key", funnelType)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .returns<FunnelRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeFunnelRow);
}

export async function getOrCreateFunnel(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  funnelType: FunnelType,
) {
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const { data: existingFunnel, error: selectError } = await supabase
    .from("funnels")
    .select(funnelSelect)
    .eq("organization_id", organization.id)
    .eq("template_key", funnelType)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<FunnelRow[]>();

  if (selectError) {
    throw new Error(selectError.message);
  }

  let funnel = existingFunnel?.[0] ? normalizeFunnelRow(existingFunnel[0]) : null;
  if (!funnel) {
    const { data: created, error: insertError } = await supabase
      .from("funnels")
      .insert({
        organization_id: organization.id,
        template_key: funnelType,
        name: definition.name,
        builder_key: "lovable",
        created_by: user.id,
        updated_by: user.id,
      })
      .select(funnelSelect)
      .single<FunnelRow>();

    if (insertError) {
      const { data: raced } = await supabase
        .from("funnels")
        .select(funnelSelect)
        .eq("organization_id", organization.id)
        .eq("template_key", funnelType)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .returns<FunnelRow[]>();
      if (!raced?.[0]) throw new Error(insertError.message);
      funnel = normalizeFunnelRow(raced[0]);
    } else {
      funnel = normalizeFunnelRow(created);
    }
  }

  const steps = await ensureFunnelSteps(supabase, organization.id, funnel.id, funnelType);
  return { funnel, steps };
}

export async function getFunnelById(
  supabase: SupabaseClient,
  organization: Organization,
  funnelId: string,
) {
  const { data, error } = await supabase
    .from("funnels")
    .select(funnelSelect)
    .eq("organization_id", organization.id)
    .eq("id", funnelId)
    .is("archived_at", null)
    .maybeSingle<FunnelRow>();

  if (error) throw new Error(error.message);
  return data ? normalizeFunnelRow(data) : null;
}

export async function createFunnel(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  input: {
    name?: string;
    contextId?: string | null;
    builderKey?: BuilderKey;
    builderProjectUrl?: string;
    duplicateFromId?: string;
  },
) {
  const source = input.duplicateFromId
    ? await getFunnelById(supabase, organization, input.duplicateFromId)
    : null;
  const { data, error } = await supabase
    .from("funnels")
    .insert({
      organization_id: organization.id,
      template_key: "book-a-call",
      name: input.name?.trim() || (source ? `${source.name} Copy` : "Management Workspace"),
      context_id: input.contextId ?? source?.context_id ?? null,
      builder_key: input.builderKey ?? source?.builder_key ?? "lovable",
      builder_project_url: input.builderProjectUrl?.trim() ?? source?.builder_project_url ?? "",
      tech_stack: source?.tech_stack ?? {},
      duplicated_from: source?.id ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select(funnelSelect)
    .single<FunnelRow>();

  if (error) throw new Error(error.message);
  const funnel = normalizeFunnelRow(data);
  const steps = await ensureFunnelSteps(supabase, organization.id, funnel.id, "book-a-call");

  if (source) {
    const { data: sourceSteps } = await supabase
      .from("funnel_steps")
      .select("step_key,status,url,notes,assigned_to,metadata")
      .eq("funnel_id", source.id);
    await Promise.all(
      (sourceSteps ?? []).map((step) =>
        supabase
          .from("funnel_steps")
          .update({
            status: step.status,
            url: step.url,
            notes: step.notes,
            assigned_to: step.assigned_to,
            metadata: step.metadata,
          })
          .eq("funnel_id", funnel.id)
          .eq("step_key", step.step_key),
      ),
    );
  }

  return { funnel, steps };
}

export async function updateFunnel(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  funnelId: string,
  input: {
    name?: string;
    contextId?: string | null;
    builderKey?: BuilderKey;
    builderProjectUrl?: string;
    techStack?: Record<string, unknown>;
    status?: "draft" | "ready" | "launching" | "launched";
  },
) {
  const { data, error } = await supabase
    .from("funnels")
    .update({
      ...(input.name !== undefined ? { name: input.name.trim() || "Management Workspace" } : {}),
      ...(input.contextId !== undefined ? { context_id: input.contextId } : {}),
      ...(input.builderKey ? { builder_key: input.builderKey } : {}),
      ...(input.builderProjectUrl !== undefined ? { builder_project_url: input.builderProjectUrl.trim() } : {}),
      ...(input.techStack ? { tech_stack: input.techStack } : {}),
      ...(input.status ? { status: input.status } : {}),
      updated_by: user.id,
    })
    .eq("id", funnelId)
    .eq("organization_id", organization.id)
    .select(funnelSelect)
    .single<FunnelRow>();

  if (error) throw new Error(error.message);
  return normalizeFunnelRow(data);
}

export async function archiveFunnel(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  funnelId: string,
) {
  const { error } = await supabase
    .from("funnels")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", funnelId)
    .eq("organization_id", organization.id);

  if (error) throw new Error(error.message);
}

export async function ensureFunnelSteps(
  supabase: SupabaseClient,
  organizationId: string,
  funnelId: string,
  funnelType: FunnelType,
) {
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const definitionKeys = new Set(definition.steps.map((step) => step.key));
  const { data: existing, error: stepsError } = await supabase
    .from("funnel_steps")
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .eq("funnel_id", funnelId)
    .order("step_order", { ascending: true })
    .returns<FunnelStepRow[]>();

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  const existingKeys = new Set((existing ?? []).map((step) => step.step_key));
  const missing = definition.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !existingKeys.has(step.key));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("funnel_steps").upsert(
      missing.map(({ step, index }) => ({
        organization_id: organizationId,
        funnel_id: funnelId,
        step_key: step.key,
        step_order: index + 1,
        title: step.title,
        ai_agent_id: step.agentId,
      })),
      { onConflict: "funnel_id,step_key" },
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await Promise.all(
    definition.steps.map((step, index) =>
      supabase
        .from("funnel_steps")
        .update({
          step_order: index + 1,
          title: step.title,
          ai_agent_id: step.agentId,
        })
        .eq("funnel_id", funnelId)
        .eq("step_key", step.key),
    ),
  );

  const { data: finalSteps, error: finalError } = await supabase
    .from("funnel_steps")
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .eq("funnel_id", funnelId)
    .order("step_order", { ascending: true })
    .returns<FunnelStepRow[]>();

  if (finalError) {
    throw new Error(finalError.message);
  }

  return (finalSteps ?? []).filter((step) => definitionKeys.has(step.step_key));
}

export async function getCreditAccount(
  supabase: SupabaseClient,
  organization: Organization,
) {
  const { data, error } = await supabase
    .from("credit_accounts")
    .select("id,organization_id,balance_credits,lifetime_credits_purchased,lifetime_credits_spent")
    .eq("organization_id", organization.id)
    .maybeSingle<CreditAccountRow>();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateFunnelStep(
  supabase: SupabaseClient,
  organization: Organization,
  stepId: string,
  input: Partial<Pick<FunnelStepRow, "status" | "url" | "notes" | "assigned_to" | "metadata">>,
) {
  const { data, error } = await supabase
    .from("funnel_steps")
    .update(input)
    .eq("id", stepId)
    .eq("organization_id", organization.id)
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .single<FunnelStepRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getAIDefinitions(
  supabase: SupabaseClient,
  funnelType?: FunnelType,
) {
  const { data, error } = await supabase
    .from("pre_made_ai_definitions")
    .select("agent_id,title,funnel_types,description,default_prompt,default_criteria")
    .order("title", { ascending: true })
    .returns<AIDefinitionRow[]>();

  if (error) {
    return AI_DEFINITIONS
      .filter((definition) => !funnelType || definition.funnelTypes.includes(funnelType))
      .map((definition) => ({
        agent_id: definition.agentId,
        title: definition.title,
        funnel_types: definition.funnelTypes,
        description: definition.description,
        default_prompt: definition.defaultPrompt,
        default_criteria: definition.defaultCriteria,
      }));
  }

  return (data ?? []).filter((definition) => !funnelType || definition.funnel_types.includes(funnelType));
}

export async function getTrainingRows(
  supabase: SupabaseClient,
  organization: Organization,
  funnelType: FunnelType,
) {
  const definitions = await getAIDefinitions(supabase, funnelType);
  const ids = definitions.map((definition) => definition.agent_id);
  const { data, error } = ids.length
    ? await supabase
        .from("workspace_ai_training")
        .select("id,organization_id,agent_id,overall_description,framework,criteria,ai_sequence,training_refs,updated_at")
        .eq("organization_id", organization.id)
        .in("agent_id", ids)
        .returns<TrainingRow[]>()
    : { data: [] as TrainingRow[], error: null };

  if (error) {
    throw new Error(error.message);
  }

  return { definitions, trainingRows: data ?? [] };
}

export async function ensureLearningItems(
  supabase: SupabaseClient,
  organization: Organization,
  user: User,
  funnelType: FunnelType,
) {
  const { data: existing, error: selectError } = await supabase
    .from("funnel_learning_items")
    .select("id,organization_id,funnel_type,section,item_type,item_order,title,body")
    .eq("organization_id", organization.id)
    .eq("funnel_type", funnelType)
    .order("item_order", { ascending: true })
    .returns<LearningItemRow[]>();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if ((existing ?? []).length > 0) {
    return existing ?? [];
  }

  const defaults = DEFAULT_LEARNING_ITEMS[funnelType];
  const { error: insertError } = await supabase.from("funnel_learning_items").insert(
    defaults.map((item, index) => ({
      organization_id: organization.id,
      funnel_type: funnelType,
      section: item.section,
      item_type: item.itemType,
      item_order: index + 1,
      title: item.title,
      body: item.body,
      updated_by: user.id,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { data: finalItems, error: finalError } = await supabase
    .from("funnel_learning_items")
    .select("id,organization_id,funnel_type,section,item_type,item_order,title,body")
    .eq("organization_id", organization.id)
    .eq("funnel_type", funnelType)
    .order("item_order", { ascending: true })
    .returns<LearningItemRow[]>();

  if (finalError) {
    throw new Error(finalError.message);
  }

  return finalItems ?? [];
}

export async function getRecentAIOutputs(
  supabase: SupabaseClient,
  organization: Organization,
  limit = 8,
) {
  const { data, error } = await supabase
    .from("funnel_ai_outputs")
    .select("id,agent_id,output_text,status,created_at,metadata")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AIOutputRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function buildAIOutputText(input: {
  agentTitle: string;
  agentPrompt: string;
  criteria: string[];
  companyContext: CompanyContextData;
  stepTitle?: string;
  stepNotes?: string;
  training?: Partial<TrainingRow>;
  learnings?: string;
}) {
  const companyText = companyContextToText(input.companyContext);
  const criteria = [
    ...input.criteria,
    ...(input.training?.criteria ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  ];
  const sections = [
    `# ${input.agentTitle} Draft`,
    input.stepTitle ? `## Funnel Step\n${input.stepTitle}` : "",
    input.stepNotes ? `## Step Notes\n${input.stepNotes}` : "",
    input.training?.overall_description ? `## Workspace Training\n${input.training.overall_description}` : "",
    input.training?.framework ? `## Framework\n${input.training.framework}` : "",
    `## Source Prompt\n${input.training?.ai_sequence?.trim() || input.agentPrompt}`,
    criteria.length ? `## Criteria\n${criteria.map((item) => `- ${item}`).join("\n")}` : "",
    companyText ? `## AI Context Document\n${companyText}` : "## AI Context Document\nNo context has been saved yet.",
    input.learnings ? `## Learnings\n${input.learnings}` : "## Learnings\nNo learnings have been saved yet.",
    "## Output\nDraft created from the current context and learnings.",
  ];
  return sections.filter(Boolean).join("\n\n");
}
