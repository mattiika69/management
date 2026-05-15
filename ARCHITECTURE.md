# HyperOptimal SaaS App Architecture Standard

Last updated: May 15, 2026.

This document is authoritative for HyperOptimal single-use apps. `AGENTS.md`,
`INFRASTRUCTURE.md`, and implementation work must reference and follow it.

## Operating Rules

- Keep useful product-specific code.
- Standardize the shared foundation across the app.
- Do not treat local-only work as complete.
- Use Supabase migrations for persistent data.
- Add Row Level Security for every application table.
- Use server-side routes/actions for writes.
- Keep client-facing pages free of internal notes, engineering status, and
  unnecessary explainers.
- Run the smallest relevant checks before reporting completion.
- Commit as `mattiika69 <matt@1000xleads.com>`.
- Push to GitHub `main`.
- Verify Vercel production deployment from GitHub `main`.
- Verify Supabase migration state when schema changed.

## Universal App Contract

Every app must be a real client-facing, cloud-backed, multi-tenant SaaS app
from the first step.

Every app must include Next.js, TypeScript, Tailwind, Montserrat everywhere,
Supabase Auth, Supabase database, Supabase RLS, a multi-tenant workspace model,
team members and invites, Stripe-compatible billing, Resend email, Roezan SMS,
Claude API for AI, Slack, Telegram, Settings, database-first persistence,
GitHub source control, Vercel deployment, desktop-first responsive UI, and a
mobile usable fallback.

Every product feature must support authenticated users, workspace ownership,
team membership, tenant isolation, RLS-protected persistence, auditability for
sensitive actions, billing checks when relevant, Slack and Telegram access when
relevant, and no local-only durable state.

## Cloud Identity

- Repository: `mattiika69/management`.
- Default branch: `main`.
- Commit author: `mattiika69 <matt@1000xleads.com>`.
- Durable work pushes to `main` unless explicitly requested otherwise.
- Vercel production branch is `main`.
- Production deployments should originate from GitHub `main`.
- Supabase migrations live in this repo and must be applied to the cloud
  project when schema changes.

## Data Persistence

Supabase is the durable source of truth.

Do not use localStorage, sessionStorage, IndexedDB, browser-only state,
in-memory arrays, temporary files, generated JSON files, unsynced client cache,
or CLI output as canonical product storage.

Allowed local state is temporary form input before save, UI-only state, loading
state, and local development files while implementing.

Every create, edit, delete, import, generation, send, receive, sync, schedule,
billing, team, Slack, Telegram, email, or SMS action must write to Supabase or
the appropriate cloud provider before showing durable success. If persistence
fails, surface the failure, preserve user input where possible, and do not show
fake success.

## Multi-Tenant Data Architecture

Canonical shared tables:

- `tenants`
- `user_profiles`
- `tenant_memberships`
- `tenant_invitations`
- `admin_audit_log`

Compatibility tables may remain when an existing app already used
`organizations`, `organization_memberships`, or `organization_invitations`, but
new schema must include canonical `tenant_id` fields and sync compatibility
rows.

Every workspace-owned app table must include:

- `id`
- `tenant_id`
- `created_at`
- `updated_at`
- `created_by_user_id` where relevant
- `updated_by_user_id` where relevant
- `archived_at` or `deleted_at` for reversible destructive actions

Default flow:

1. Authenticate the user.
2. Resolve the active tenant.
3. Verify tenant membership.
4. Check role for owner/admin actions.
5. Read or write only rows for that tenant.
6. Audit sensitive actions.

Default roles are `owner`, `admin`, `member`, and `viewer`.

## RLS Architecture

Every application table must have RLS enabled.

Required helper functions:

```sql
public.is_tenant_member(tenant_id uuid)
public.has_tenant_role(tenant_id uuid, roles text[])
```

Default policies:

- Members can read tenant-owned rows.
- Members can create normal product rows only for their tenant.
- Owners/admins manage team, billing, integrations, settings, schedules, and
  destructive actions.
- Provider webhook writes use service-role only after signature/secret
  verification.
- Controlled system jobs use service-role only after intentional job-secret
  verification.

## Service Role

Service-role access is allowed only in trusted server code after one condition
is true:

- The user was authenticated and tenant-checked.
- A provider webhook signature or secret was verified.
- A controlled system job is running intentionally.

Never expose service-role keys to the client.

## Auth

Production auth uses Supabase Auth.

Required auth surfaces: sign up, log in, log out, reset password, update
password, auth callback, invite acceptance, privacy policy, and terms of
service.

Temporary login bypass may exist only as a development switch:

- `DISABLE_LOGIN_AUTH`
- `AUTH_BYPASS_EMAIL`
- `AUTH_BYPASS_TENANT_ID`
- `AUTH_BYPASS_USER_ID`

Auth bypass must not remove tenant resolution, RLS-aware data design, or
server-side authorization checks.

## Team

Team lives under Settings.

Required tables:

- `tenant_memberships`
- `tenant_invitations`
- `user_profiles`
- `admin_audit_log`

Owners/admins invite team members by email, choose role, write invite records
before email delivery, send via Resend, store only token hashes, enforce expiry
and invited-email acceptance, upsert memberships on accept, show pending and
failed invites to owners/admins, support cancel/role change/removal, audit team
actions, and keep seats Stripe-compatible.

## Billing

Stripe is the billing source of truth.

Required tables:

- `billing_customers`
- `billing_subscriptions`
- `billing_subscription_items`
- `billing_events`
- `billing_usage_records` when usage limits exist

Required routes:

- `GET /billing/checkout`
- `POST /api/billing/webhook`
- `GET /api/billing/status`
- `POST /api/billing/portal`
- `GET /api/billing/plans`

Billing-sensitive changes are server-controlled and audited.

## Settings

Required tabs: Account, Team, Billing, Integrations, Scheduling, Slack, and
Telegram.

Optional tabs: Profile, Security, Notifications, API keys, Webhooks, and owner
or admin-only diagnostics.

Settings screens must be client-facing and action-oriented. Do not expose
implementation notes, provider setup instructions, architecture language, or
internal engineering status in normal client-facing Settings pages.

## Slack And Telegram

Slack and Telegram must have parity and use tenant-scoped shared services.

Required integration tables:

- `slack_installations`
- `slack_links`
- `telegram_link_codes`
- `telegram_links`
- `integration_inbound_events`
- `integration_outbound_messages`
- `integration_processed_events`
- `integration_command_sessions`
- `integration_secrets`
- `integration_channel_links`
- `integration_routing_rules`
- `integration_delivery_preferences`

Required behavior includes encrypted server-side secrets, Slack signature
verification, Telegram webhook secret verification, event dedupe, persisted
inbound/outbound messages, tenant/user/channel links, group/channel support,
membership and role checks, clear success/failure messages, loop prevention,
and audit of sensitive actions.

Shared command families: menu/help, save records, generate outputs, repurpose
inputs, add learning/feedback, search/read records, update records, review
queue, ops transactions/rules/snapshots, calendar/event capture, scheduled
workflows, and disconnect/cancel/skip.

## Scheduled Workflows

Every app must include Settings Scheduling.

Required tables:

- `integration_workflow_schedules`
- `integration_workflow_runs`
- `integration_workflow_run_events`

Owners/admins can create, edit, pause, archive, run now, inspect history, set
targets for Slack, Telegram, or both, choose cadence and timezone, and define
workflow/action/message fields. Runs write durable records before execution and
update status after execution.

Required routes:

- `GET /api/integrations/schedules`
- `POST /api/integrations/schedules`
- `PATCH /api/integrations/schedules/:id`
- `DELETE /api/integrations/schedules/:id`
- `POST /api/integrations/schedules/:id/run`
- `GET /api/integrations/schedule-runs`
- `POST /api/workflows/scheduled`

## Agent Operator

Slack and Telegram agents may operate the app only through controlled,
audited, tenant-checked workflows. Owners/admins can request high-risk
app-editing operations, high-risk commands require confirmation, secrets are
never exposed, arbitrary shell commands are not allowed without allowlist and
approval, and production deploys come from GitHub `main`.

Required tables:

- `agent_requests`
- `agent_actions`
- `agent_approvals`
- `agent_code_tasks`
- `agent_deployments`
- `agent_tool_runs`

## Email, SMS, And AI

Email uses Resend. Invites use Resend by default, sends are server-side,
tenant-scoped where relevant, failures are surfaced, and sensitive sends are
audited.

SMS uses Roezan. Sends are server-side, consent-aware, quiet-hours-aware where
relevant, rate limited, tenant-checked, billing-checked when relevant, and
audited.

AI uses Claude via Anthropic. Calls happen server-side, outputs are saved to
Supabase before becoming product state, prompt inputs/outputs are persisted
when they affect product state, failures are surfaced, and usage can connect to
billing and limits.

## Required Environment Variables

Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

Temporary auth bypass: `DISABLE_LOGIN_AUTH`, `AUTH_BYPASS_EMAIL`,
`AUTH_BYPASS_TENANT_ID`, `AUTH_BYPASS_USER_ID`.

Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_ONBOARDING_PRICE_ID`.

Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`.

SMS: `ROEZAN_API_KEY`, `ROEZAN_API_BASE_URL`.

AI: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`.

Integration security: `INTEGRATION_SECRET_KEY`.

Scheduled worker: `SCHEDULE_WORKER_SECRET`.

Slack: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CLIENT_ID`,
`SLACK_CLIENT_SECRET`.

Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_BOT_USERNAME`.

## UI

Use Montserrat everywhere. Use a desktop-first shared shell with mobile usable
fallback. Put every app page in the sidebar. Put Billing, Team, Integrations,
Scheduling, Slack, and Telegram inside Settings. Do not show pages that are not
part of the app. Do not show internal notes or implementation language in
normal product UI.

Product pages should show workflow controls, data, actions, empty states, error
states, and necessary user-facing instructions only.

## Verification

Before reporting completion:

- Git remote points to the correct GitHub repo.
- Latest commit author is `mattiika69 <matt@1000xleads.com>`.
- Latest commit is pushed to `main`.
- Vercel production deployment is tied to GitHub `main`.
- Supabase migrations are applied when schema changed.
- RLS exists for every application table.
- Auth and tenant checks protect server writes.
- Team invites send through Resend.
- Invite acceptance writes to `tenant_memberships`.
- Billing state is server-controlled.
- Slack and Telegram webhooks verify provider secrets.
- Slack and Telegram events are deduped.
- Scheduled workflows persist run records.
- No durable product state relies on local-only storage.
- Client-facing pages contain no internal notes.
- Smallest relevant checks pass.
