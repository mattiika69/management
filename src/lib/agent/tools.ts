import "server-only";
import { randomUUID } from "crypto";
import { getResend, getResendFromEmail, normalizeEmail, resendIdempotencyKey } from "@/lib/resend/server";
import { getStripe } from "@/lib/stripe/server";
import { buildInviteUrl, createInvitationToken, hashInvitationToken, isTeamRole } from "@/lib/team/invitations";
import { writeAgentAudit } from "@/lib/agent/audit";
import type {
  AgentContext,
  AgentToolDefinition,
  AgentToolInput,
  AgentToolName,
  AgentToolResult,
} from "@/lib/agent/types";

type RecordConfig = {
  table: string;
  tenantColumn: "tenant_id" | "organization_id";
  searchColumns: string[];
  select: string;
  adminOnly?: boolean;
  label: string;
};

const recordConfigs: Record<string, RecordConfig> = {
  employees: {
    table: "employees",
    tenantColumn: "tenant_id",
    searchColumns: ["full_name", "email", "role_title", "department"],
    select: "id,full_name,email,role_title,department,employment_status,created_at,updated_at",
    adminOnly: true,
    label: "employee",
  },
  learning_items: {
    table: "learning_items",
    tenantColumn: "tenant_id",
    searchColumns: ["title", "body", "category"],
    select: "id,title,body,category,source_provider,source_label,created_at,updated_at",
    label: "learning",
  },
  agent_requests: {
    table: "agent_requests",
    tenantColumn: "tenant_id",
    searchColumns: ["request_text", "status", "risk_level"],
    select: "id,request_text,source_provider,risk_level,status,created_at,updated_at",
    adminOnly: true,
    label: "agent request",
  },
  meetings: {
    table: "meetings",
    tenantColumn: "tenant_id",
    searchColumns: ["title", "notes", "meeting_type", "client_name"],
    select: "id,meeting_type,title,meeting_date,client_name,notes,created_at,updated_at",
    label: "meeting",
  },
};

function text(input: AgentToolInput, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function object(input: AgentToolInput, key: string) {
  const value = input[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requireAdmin(context: AgentContext) {
  if (context.role !== "owner" && context.role !== "admin") {
    throw new Error("Owner or admin access is required for this action.");
  }
}

function configFor(input: AgentToolInput) {
  const recordType = text(input, "recordType") || "app_data";
  if (recordType === "app_data") return null;
  const config = recordConfigs[recordType];
  if (!config) throw new Error(`Unsupported record type: ${recordType}.`);
  return config;
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, "\\$&");
}

function summarizeRows(rows: Array<Record<string, unknown>>, label: string) {
  if (!rows.length) return `No ${label} records found.`;
  return rows
    .map((row, index) => {
      const title = row.full_name ?? row.title ?? row.request_text ?? row.client_name ?? row.id;
      const status = row.status ?? row.employment_status ?? row.meeting_date ?? "";
      return `${index + 1}. ${String(title)}${status ? ` (${String(status)})` : ""}`;
    })
    .join("\n");
}

async function searchConfig(context: AgentContext, config: RecordConfig, query: string) {
  const pattern = `%${escapeLike(query)}%`;
  let builder = context.supabase
    .from(config.table)
    .select(config.select)
    .eq(config.tenantColumn, context.organizationId)
    .limit(8);

  if (config.table !== "agent_requests") {
    builder = builder.is("archived_at", null);
  }

  if (query) {
    builder = builder.or(config.searchColumns.map((column) => `${column}.ilike.${pattern}`).join(","));
  }

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data as Array<Record<string, unknown>>;
}

async function searchAppData(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  const query = text(input, "query");
  const specificConfig = configFor(input);
  const configs = specificConfig ? [specificConfig] : Object.values(recordConfigs);
  const groups = await Promise.all(configs.map(async (config) => ({
    config,
    rows: await searchConfig(context, config, query),
  })));
  const lines = groups
    .filter((group) => group.rows.length)
    .flatMap((group) => [`${group.config.label}s`, summarizeRows(group.rows, group.config.label)]);

  return {
    ok: true,
    summary: lines.length ? lines.join("\n") : `No app data matched "${query}".`,
    data: groups,
  };
}

async function getRecord(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  const config = configFor(input);
  const recordId = text(input, "recordId");
  if (!config || !recordId) throw new Error("Record type and record id are required.");

  const { data, error } = await context.supabase
    .from(config.table)
    .select(config.select)
    .eq(config.tenantColumn, context.organizationId)
    .eq("id", recordId)
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  if (!data) return { ok: false, summary: `${config.label} was not found.`, status: "failed" };
  return { ok: true, summary: JSON.stringify(data, null, 2), data, targetTable: config.table, targetId: recordId };
}

function employeePayload(data: Record<string, unknown>, context: AgentContext) {
  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  if (!fullName) throw new Error("Employee name is required.");
  return {
    tenant_id: context.organizationId,
    organization_id: context.organizationId,
    full_name: fullName,
    email: normalizeEmail(data.email) || null,
    role_title: typeof data.roleTitle === "string" ? data.roleTitle.trim() : "",
    department: typeof data.department === "string" ? data.department.trim() : "",
    employment_status: "active",
    timezone: "America/New_York",
    created_by_user_id: context.actorUserId,
    updated_by_user_id: context.actorUserId,
  };
}

async function createRecord(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  const config = configFor(input);
  const data = object(input, "data");
  if (!config) throw new Error("Choose a supported record type.");
  if (config.adminOnly) requireAdmin(context);

  let payload: Record<string, unknown>;
  if (config.table === "employees") {
    payload = employeePayload(data, context);
  } else if (config.table === "learning_items") {
    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) throw new Error("Learning title is required.");
    payload = {
      tenant_id: context.organizationId,
      organization_id: context.organizationId,
      title,
      body: typeof data.body === "string" ? data.body.trim() : "",
      category: typeof data.category === "string" ? data.category.trim() || "general" : "general",
      source_provider: context.platform,
      source_label: context.sourceLabel ?? context.platform,
      source_channel_id: context.externalChannelId ?? null,
      source_user_id: context.externalUserId ?? context.actorUserId,
      sync_status: "synced",
      created_by_user_id: context.actorUserId,
      updated_by_user_id: context.actorUserId,
    };
  } else {
    const requestText = typeof data.requestText === "string" ? data.requestText.trim() : "";
    if (!requestText) throw new Error("Request text is required.");
    payload = {
      tenant_id: context.organizationId,
      requested_by_user_id: context.actorUserId,
      source_provider: context.platform,
      request_text: requestText,
      risk_level: data.riskLevel === "high" || data.riskLevel === "low" ? data.riskLevel : "normal",
      status: "pending",
      metadata: { source: "agent_tool" },
    };
  }

  const { data: created, error } = await context.supabase
    .from(config.table)
    .insert(payload)
    .select(config.select)
    .single<Record<string, unknown>>();
  if (error) throw new Error(error.message);

  await writeAgentAudit(context, {
    action: `agent.${config.table}.created`,
    targetTable: config.table,
    targetId: String(created.id),
    after: created,
  });

  return {
    ok: true,
    status: "saved",
    summary: `Created ${config.label}: ${String(created.full_name ?? created.title ?? created.request_text ?? created.id)}`,
    data: created,
    targetTable: config.table,
    targetId: String(created.id),
    after: created,
  };
}

async function updateRecord(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  const config = configFor(input);
  const recordId = text(input, "recordId");
  const patch = object(input, "data");
  if (!config || !recordId) {
    return { ok: false, status: "failed", summary: "I need the exact record id before I can update that." };
  }
  if (config.adminOnly) requireAdmin(context);

  const before = await getRecord(context, { recordType: config.table, recordId });
  if (!before.ok) return before;

  const { data, error } = await context.supabase
    .from(config.table)
    .update({ ...patch, updated_by_user_id: context.actorUserId })
    .eq("id", recordId)
    .eq(config.tenantColumn, context.organizationId)
    .select(config.select)
    .single<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  await writeAgentAudit(context, {
    action: `agent.${config.table}.updated`,
    targetTable: config.table,
    targetId: recordId,
    before: before.data,
    after: data,
  });
  return { ok: true, status: "saved", summary: `Updated ${config.label}.`, data, targetTable: config.table, targetId: recordId, before: before.data, after: data };
}

async function deleteRecord(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  const config = configFor(input);
  const recordId = text(input, "recordId");
  if (!config || !recordId) {
    return { ok: false, status: "failed", summary: "I need the exact record id before I can delete or archive that." };
  }
  if (config.adminOnly) requireAdmin(context);

  const before = await getRecord(context, { recordType: config.table, recordId });
  if (!before.ok) return before;

  const patch = config.table === "agent_requests"
    ? { status: "cancelled" }
    : { archived_at: new Date().toISOString(), updated_by_user_id: context.actorUserId };
  const { error } = await context.supabase
    .from(config.table)
    .update(patch)
    .eq("id", recordId)
    .eq(config.tenantColumn, context.organizationId);
  if (error) throw new Error(error.message);

  await writeAgentAudit(context, {
    action: `agent.${config.table}.deleted`,
    targetTable: config.table,
    targetId: recordId,
    before: before.data,
    after: patch,
  });
  return { ok: true, status: "saved", summary: `Archived ${config.label}.`, targetTable: config.table, targetId: recordId, before: before.data, after: patch };
}

async function inviteTeamMember(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  requireAdmin(context);
  const email = normalizeEmail(input.email);
  const role = text(input, "role") || "member";
  if (!email || !isTeamRole(role)) throw new Error("A valid email and role are required.");

  const id = randomUUID();
  const token = createInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const tokenHash = hashInvitationToken(token);
  await Promise.all([
    context.supabase.from("organization_invitations").insert({
      id,
      organization_id: context.organizationId,
      email,
      role,
      token_hash: tokenHash,
      invited_by: context.actorUserId,
      expires_at: expiresAt,
    }),
    context.supabase.from("tenant_invitations").insert({
      id,
      tenant_id: context.organizationId,
      email,
      role,
      token_hash: tokenHash,
      invited_by_user_id: context.actorUserId,
      email_delivery_status: "pending",
      expires_at: expiresAt,
      metadata: { source: "agent_tool" },
    }),
  ]);

  await writeAgentAudit(context, {
    action: "agent.team.invitation.created",
    targetTable: "tenant_invitations",
    targetId: id,
    after: { email, role },
  });

  return {
    ok: true,
    status: "saved",
    summary: `Created invitation for ${email}. Send this invite link from the app email flow if delivery is needed: ${buildInviteUrl(process.env.NEXT_PUBLIC_APP_URL ?? "https://management-mattiika69.vercel.app", token)}`,
    targetTable: "tenant_invitations",
    targetId: id,
    after: { email, role },
  };
}

async function removeTeamMember(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  requireAdmin(context);
  const userId = text(input, "userId");
  if (!userId) throw new Error("User id is required.");
  if (userId === context.actorUserId) throw new Error("You cannot remove yourself from the workspace.");

  const { error } = await context.supabase
    .from("tenant_memberships")
    .update({ archived_at: new Date().toISOString() })
    .eq("tenant_id", context.organizationId)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) throw new Error(error.message);

  await writeAgentAudit(context, {
    action: "agent.team.member.removed",
    targetTable: "tenant_memberships",
    targetId: userId,
  });
  return { ok: true, status: "saved", summary: "Removed the team member if they were not the last owner.", targetTable: "tenant_memberships", targetId: userId };
}

async function getBillingStatus(context: AgentContext): Promise<AgentToolResult> {
  const { data, error } = await context.supabase
    .from("billing_subscriptions")
    .select("status,plan_key,price_id,seat_quantity,current_period_end,cancel_at_period_end")
    .eq("tenant_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Record<string, unknown>>();
  if (error) throw new Error(error.message);
  return { ok: true, summary: data ? JSON.stringify(data, null, 2) : "No billing subscription is recorded yet.", data };
}

async function createBillingPortalSession(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  requireAdmin(context);
  const requestOrigin = text(input, "origin") || process.env.NEXT_PUBLIC_APP_URL || "https://management-mattiika69.vercel.app";
  const { data: customer, error } = await context.supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("organization_id", context.organizationId)
    .maybeSingle<{ stripe_customer_id: string }>();
  if (error) throw new Error(error.message);
  if (!customer?.stripe_customer_id) return { ok: false, status: "failed", summary: "No billing account found." };

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: `${requestOrigin.replace(/\/$/, "")}/settings/billing`,
  });
  await writeAgentAudit(context, {
    action: "agent.billing.portal.created",
    targetTable: "billing_customers",
    targetId: customer.stripe_customer_id,
  });
  return { ok: true, status: "sent", summary: `Billing portal: ${session.url}`, data: { url: session.url } };
}

async function sendEmail(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  requireAdmin(context);
  const to = normalizeEmail(input.to);
  const subject = text(input, "subject");
  const body = text(input, "body");
  if (!to || !subject || !body) throw new Error("Email recipient, subject, and body are required.");

  const idempotencyKey = resendIdempotencyKey("agent-email", context.organizationId, to, subject, body);
  const result = await getResend().emails.send({
    from: getResendFromEmail(),
    to,
    subject,
    text: body,
  }, { idempotencyKey });
  if (result.error) throw new Error(result.error.message);

  await writeAgentAudit(context, {
    action: "agent.email.sent",
    targetTable: "email_messages",
    metadata: { to, subject, idempotencyKey, providerMessageId: result.data?.id ?? null },
  });
  return { ok: true, status: "sent", summary: `Sent email to ${to}.`, data: { id: result.data?.id } };
}

async function summarizeActivity(context: AgentContext, input: AgentToolInput): Promise<AgentToolResult> {
  if (text(input, "mode") === "help") {
    return {
      ok: true,
      summary: [
        "I can search workspace data, read records, create employees/learnings/tasks, invite team members, open billing, send approved emails, and summarize activity.",
        "I ask for confirmation before destructive, billing, permission, or high-risk changes.",
      ].join("\n"),
    };
  }
  const [employees, learnings, requests] = await Promise.all([
    searchConfig(context, recordConfigs.employees, ""),
    searchConfig(context, recordConfigs.learning_items, ""),
    searchConfig(context, recordConfigs.agent_requests, ""),
  ]);
  return {
    ok: true,
    summary: [
      "Workspace activity summary",
      `Employees: ${employees.length}`,
      `Recent learnings: ${learnings.length}`,
      `Recent agent requests: ${requests.length}`,
    ].join("\n"),
    data: { employees: employees.length, learnings: learnings.length, requests: requests.length },
  };
}

export const agentTools: Record<AgentToolName, AgentToolDefinition> = {
  search_app_data: { name: "search_app_data", description: "Search tenant-scoped app data.", handler: searchAppData },
  get_record: { name: "get_record", description: "Read one tenant-scoped record.", handler: getRecord },
  create_record: { name: "create_record", description: "Create a tenant-scoped record.", adminOnly: true, handler: createRecord },
  update_record: { name: "update_record", description: "Update a tenant-scoped record.", adminOnly: true, handler: updateRecord },
  delete_record: { name: "delete_record", description: "Archive or cancel a tenant-scoped record.", destructive: true, adminOnly: true, handler: deleteRecord },
  invite_team_member: { name: "invite_team_member", description: "Invite a team member.", permissionChanging: true, adminOnly: true, handler: inviteTeamMember },
  remove_team_member: { name: "remove_team_member", description: "Remove a team member.", destructive: true, permissionChanging: true, adminOnly: true, handler: removeTeamMember },
  get_billing_status: { name: "get_billing_status", description: "Read billing status.", adminOnly: true, handler: getBillingStatus },
  create_billing_portal_session: { name: "create_billing_portal_session", description: "Create a Stripe Customer Portal session.", billing: true, adminOnly: true, handler: createBillingPortalSession },
  send_email: { name: "send_email", description: "Send an email through Resend.", adminOnly: true, handler: sendEmail },
  summarize_activity: { name: "summarize_activity", description: "Summarize workspace activity.", handler: summarizeActivity },
  request_approval: { name: "request_approval", description: "Create an approval request.", handler: async () => ({ ok: true, summary: "Approval requested.", status: "needs_confirmation" }) },
  confirm_approval: { name: "confirm_approval", description: "Confirm a pending approval.", handler: async () => ({ ok: false, summary: "Approval confirmation is handled by the runner.", status: "failed" }) },
};
