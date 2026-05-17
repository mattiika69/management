import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AdminSession } from "@/lib/admin/require-admin";

type UserProfile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
};

type TenantMembershipRow = {
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type BillingSubscriptionRow = {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  plan_key: string | null;
  price_id: string | null;
  current_period_end: string | null;
  created_at: string;
};

type LegacySubscriptionRow = {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  created_at: string;
};

type BillingEventRow = {
  id: string;
  tenant_id: string | null;
  provider: string;
  event_id: string;
  event_type: string;
  processed_at: string | null;
  created_at: string;
};

type InboundEventRow = {
  id: string;
  tenant_id: string | null;
  provider: string;
  provider_event_id: string;
  processed_at: string | null;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  tenant_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type IntegrationStatusRows = {
  slack: Array<{ tenant_id: string; status: string | null }>;
  telegram: Array<{ tenant_id: string }>;
  calendars: Array<{ tenant_id: string; status: string | null }>;
  zoom: Array<{ tenant_id: string; status: string | null }>;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  organization: string;
  subscriptionStatus: string;
};

export type AdminOrgRow = {
  id: string;
  name: string;
  owner: string;
  plan: string;
  createdAt: string;
  memberCount: number;
  integrationStatus: string;
};

export type AdminBillingRow = {
  id: string;
  source: string;
  customerEmail: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
};

export type AdminWebhookEventRow = {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  createdAt: string;
  errorMessage: string;
};

export type AdminAuditLogRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  metadataPreview: string;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

async function listAuthUsers(admin: SupabaseClient) {
  const users: User[] = [];

  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  return users;
}

async function selectRows<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  options: { limit?: number; orderBy?: string } = {},
) {
  let query = admin.from(table).select(columns);
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: false });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<T[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function optionalRows<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  options: { limit?: number; orderBy?: string } = {},
) {
  try {
    return await selectRows<T>(admin, table, columns, options);
  } catch {
    return [];
  }
}

async function loadBase(admin: SupabaseClient) {
  const [authUsers, profiles, tenants, memberships, subscriptions, legacySubscriptions] = await Promise.all([
    listAuthUsers(admin),
    selectRows<UserProfile>(admin, "user_profiles", "user_id,email,display_name,is_admin,created_at,updated_at"),
    selectRows<TenantRow>(admin, "tenants", "id,name,slug,owner_user_id,created_at", { orderBy: "created_at" }),
    selectRows<TenantMembershipRow>(admin, "tenant_memberships", "tenant_id,user_id,role,created_at"),
    optionalRows<BillingSubscriptionRow>(
      admin,
      "billing_subscriptions",
      "id,tenant_id,stripe_customer_id,stripe_subscription_id,status,plan_key,price_id,current_period_end,created_at",
      { orderBy: "created_at" },
    ),
    optionalRows<LegacySubscriptionRow>(
      admin,
      "subscriptions",
      "id,organization_id,stripe_customer_id,stripe_subscription_id,status,price_id,current_period_end,created_at",
      { orderBy: "created_at" },
    ),
  ]);

  return { authUsers, profiles, tenants, memberships, subscriptions, legacySubscriptions };
}

function profileMap(profiles: UserProfile[]) {
  return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

function userMap(users: User[]) {
  return new Map(users.map((user) => [user.id, user]));
}

function tenantMap(tenants: TenantRow[]) {
  return new Map(tenants.map((tenant) => [tenant.id, tenant]));
}

function displayNameFor(userId: string | null | undefined, profiles: Map<string, UserProfile>, users: Map<string, User>) {
  if (!userId) return "Unknown";
  const profile = profiles.get(userId);
  const user = users.get(userId);
  return profile?.display_name || profile?.email || user?.email || `User ${userId.slice(0, 8)}`;
}

function emailFor(userId: string | null | undefined, profiles: Map<string, UserProfile>, users: Map<string, User>) {
  if (!userId) return "";
  return profiles.get(userId)?.email || users.get(userId)?.email || "";
}

function tenantNameFor(tenantId: string | null | undefined, tenants: Map<string, TenantRow>) {
  if (!tenantId) return "";
  return tenants.get(tenantId)?.name ?? "";
}

function metadataPreview(metadata: Record<string, unknown> | null) {
  if (!metadata || !Object.keys(metadata).length) return "";
  const text = JSON.stringify(metadata);
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function subscriptionStatusForTenant(
  tenantId: string,
  subscriptions: BillingSubscriptionRow[],
  legacySubscriptions: LegacySubscriptionRow[],
) {
  const subscription =
    subscriptions.find((row) => row.tenant_id === tenantId) ??
    legacySubscriptions.find((row) => row.organization_id === tenantId);

  return subscription?.status ?? "None";
}

function planForTenant(
  tenantId: string,
  subscriptions: BillingSubscriptionRow[],
  legacySubscriptions: LegacySubscriptionRow[],
) {
  const subscription =
    subscriptions.find((row) => row.tenant_id === tenantId) ??
    legacySubscriptions.find((row) => row.organization_id === tenantId);

  return subscription && "plan_key" in subscription
    ? subscription.plan_key || subscription.price_id || "Subscription"
    : subscription?.price_id || "None";
}

async function loadIntegrationStatuses(admin: SupabaseClient): Promise<IntegrationStatusRows> {
  const [slack, telegram, calendars, zoom] = await Promise.all([
    optionalRows<{ tenant_id: string; status: string | null }>(admin, "slack_installations", "tenant_id,status"),
    optionalRows<{ tenant_id: string }>(admin, "telegram_links", "tenant_id"),
    optionalRows<{ tenant_id: string; status: string | null }>(admin, "calendar_connections", "tenant_id,status"),
    optionalRows<{ tenant_id: string; status: string | null }>(admin, "zoom_connections", "tenant_id,status"),
  ]);

  return { slack, telegram, calendars, zoom };
}

function integrationStatusForTenant(tenantId: string, rows: IntegrationStatusRows) {
  const labels: string[] = [];
  if (rows.slack.some((row) => row.tenant_id === tenantId && row.status !== "revoked")) labels.push("Slack");
  if (rows.telegram.some((row) => row.tenant_id === tenantId)) labels.push("Telegram");
  if (rows.calendars.some((row) => row.tenant_id === tenantId && row.status !== "paused")) labels.push("Calendar");
  if (rows.zoom.some((row) => row.tenant_id === tenantId && row.status !== "paused")) labels.push("Zoom");
  return labels.length ? labels.join(", ") : "None";
}

export async function getAdminOverviewData(session: AdminSession) {
  const base = await loadBase(session.admin);
  const profiles = profileMap(base.profiles);
  const users = userMap(base.authUsers);
  const tenants = tenantMap(base.tenants);
  const webhookEvents = await getAdminWebhookEventsData(session, 5);
  const auditLogs = await getAdminAuditLogsData(session, 5);

  const recentSignups = [...base.authUsers]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 5)
    .map((user) => ({
      id: user.id,
      email: (user.email ?? emailFor(user.id, profiles, users)) || "Unknown",
      name: displayNameFor(user.id, profiles, users),
      createdAt: user.created_at ?? null,
    }));

  const activeSubscriptions = [
    ...base.subscriptions.map((row) => row.status),
    ...base.legacySubscriptions.map((row) => row.status),
  ].filter((status) => ACTIVE_SUBSCRIPTION_STATUSES.has(status)).length;

  return {
    totals: {
      users: base.authUsers.length,
      organizations: base.tenants.length,
      activeSubscriptions,
      auditEvents: auditLogs.length,
    },
    recentSignups,
    recentWebhookEvents: webhookEvents.slice(0, 5),
    recentAuditLogs: auditLogs.slice(0, 5),
    tenantNames: tenants,
  };
}

export async function getAdminUsersData(session: AdminSession): Promise<AdminUserRow[]> {
  const base = await loadBase(session.admin);
  const profiles = profileMap(base.profiles);
  const tenants = tenantMap(base.tenants);
  const tenantByUser = new Map<string, string>();

  for (const membership of base.memberships) {
    if (!tenantByUser.has(membership.user_id)) tenantByUser.set(membership.user_id, membership.tenant_id);
  }

  return [...base.authUsers]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((user) => {
      const profile = profiles.get(user.id);
      const tenantId = tenantByUser.get(user.id);
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        name:
          profile?.display_name ||
          (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "") ||
          "",
        role: profile?.is_admin ? "Admin" : "User",
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        organization: tenantNameFor(tenantId, tenants) || "None",
        subscriptionStatus: tenantId
          ? subscriptionStatusForTenant(tenantId, base.subscriptions, base.legacySubscriptions)
          : "None",
      };
    });
}

export async function getAdminOrgsData(session: AdminSession): Promise<AdminOrgRow[]> {
  const base = await loadBase(session.admin);
  const profiles = profileMap(base.profiles);
  const users = userMap(base.authUsers);
  const integrations = await loadIntegrationStatuses(session.admin);

  return base.tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    owner: displayNameFor(tenant.owner_user_id, profiles, users),
    plan: planForTenant(tenant.id, base.subscriptions, base.legacySubscriptions),
    createdAt: tenant.created_at,
    memberCount: base.memberships.filter((membership) => membership.tenant_id === tenant.id).length,
    integrationStatus: integrationStatusForTenant(tenant.id, integrations),
  }));
}

export async function getAdminBillingData(session: AdminSession): Promise<AdminBillingRow[]> {
  const base = await loadBase(session.admin);
  const profiles = profileMap(base.profiles);
  const users = userMap(base.authUsers);
  const tenants = tenantMap(base.tenants);

  const canonical = base.subscriptions.map((subscription) => {
    const tenant = tenants.get(subscription.tenant_id);
    return {
      id: subscription.id,
      source: "billing_subscriptions",
      customerEmail: emailFor(tenant?.owner_user_id, profiles, users) || "Unknown",
      plan: subscription.plan_key || subscription.price_id || "Subscription",
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      stripeCustomerId: subscription.stripe_customer_id ?? "",
      stripeSubscriptionId: subscription.stripe_subscription_id ?? "",
    };
  });

  const legacy = base.legacySubscriptions.map((subscription) => {
    const tenant = tenants.get(subscription.organization_id);
    return {
      id: subscription.id,
      source: "subscriptions",
      customerEmail: emailFor(tenant?.owner_user_id, profiles, users) || "Unknown",
      plan: subscription.price_id || "Subscription",
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      stripeCustomerId: subscription.stripe_customer_id,
      stripeSubscriptionId: subscription.stripe_subscription_id ?? "",
    };
  });

  return [...canonical, ...legacy];
}

export async function getAdminWebhookEventsData(session: AdminSession, limit = 100): Promise<AdminWebhookEventRow[]> {
  const [billingEvents, inboundEvents] = await Promise.all([
    optionalRows<BillingEventRow>(
      session.admin,
      "billing_events",
      "id,tenant_id,provider,event_id,event_type,processed_at,created_at",
      { orderBy: "created_at", limit },
    ),
    optionalRows<InboundEventRow>(
      session.admin,
      "integration_inbound_events",
      "id,tenant_id,provider,provider_event_id,processed_at,error_message,payload,created_at",
      { orderBy: "created_at", limit },
    ),
  ]);

  return [
    ...billingEvents.map((event) => ({
      id: event.id,
      provider: event.provider,
      eventType: event.event_type,
      status: event.processed_at ? "processed" : "received",
      createdAt: event.created_at,
      errorMessage: "",
    })),
    ...inboundEvents.map((event) => ({
      id: event.id,
      provider: event.provider,
      eventType:
        typeof event.payload?.type === "string"
          ? event.payload.type
          : typeof event.payload?.event === "string"
            ? event.payload.event
            : "inbound_event",
      status: event.error_message ? "failed" : event.processed_at ? "processed" : "received",
      createdAt: event.created_at,
      errorMessage: event.error_message ?? "",
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getAdminAuditLogsData(session: AdminSession, limit = 100): Promise<AdminAuditLogRow[]> {
  const base = await loadBase(session.admin);
  const profiles = profileMap(base.profiles);
  const users = userMap(base.authUsers);
  const rows = await optionalRows<AuditLogRow>(
    session.admin,
    "admin_audit_log",
    "id,tenant_id,actor_user_id,action,target_table,target_id,metadata,created_at",
    { orderBy: "created_at", limit },
  );

  return rows.map((row) => ({
    id: row.id,
    actor: displayNameFor(row.actor_user_id, profiles, users),
    action: row.action,
    target: [row.target_table, row.target_id].filter(Boolean).join(": ") || "None",
    createdAt: row.created_at,
    metadataPreview: metadataPreview(row.metadata),
  }));
}
