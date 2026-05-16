# HyperOptimal Funnel Infrastructure

Author: mattiika69

`ARCHITECTURE.md` is the authoritative HyperOptimal SaaS standard. This file
tracks the current HyperOptimal Funnel implementation state against that
standard.

## Hard Rules

- Real product data must never be saved locally.
- Do not use local files, static JSON, localStorage, sessionStorage, IndexedDB, or in-memory-only stores as persistence for customer/workspace data.
- Every user-facing data flow must read and write through the cloud database layer.
- Every persistent business record must be organization-scoped.
- Every database-backed feature must have row-level security policies before it is treated as production-ready.
- The app shell must follow the Scaling Metrics design system: slate gradient sidebar, compact section labels, compact tab controls, white/gray page canvas, and no fake/unbuilt sidebar sections.

## Connected Services

| Service | Status | Project |
| --- | --- | --- |
| GitHub | Connected | `https://github.com/mattiika69/management.git`, branch `main` |
| Supabase | Connected | Project ref `oxsopkedpalgdlcmbxzs` |
| Vercel | Connected | Project `funnel`, project id `prj_g1tKXY8pXxiO4j4yNpcvAYsjn0CC`, production URL `https://funnel-mattiika69.vercel.app` |

Deploy rule: push to GitHub `main` from `mattiika69`; Vercel should deploy from the Git integration. Manual `vercel deploy` is fallback-only.

## Current Platform Capabilities

- Auth: Supabase auth pages and callback routes exist for signup, login, reset password, and update password.
- Temporary auth bypass: `DISABLE_LOGIN_AUTH` can be configured for development-only login bypass. Remove or disable this before real customer launch.
- Multi-tenancy: canonical tenant tables are present and synced with compatibility organization tables; persistent app tables are tenant-scoped with organization compatibility columns where legacy product code still uses them.
- RLS: migrations enable row-level security and member policies on app data tables.
- Team members: Settings > Team supports member listing and invitations.
- Stripe billing: database tables and checkout route exist.
- V1 credit billing: Book-a-Call launch assets spend credits per generated asset; Stripe credit checkout and webhook ledger writes exist.
- Data persistence: company document, funnels, funnel steps, training, learning, AI outputs, notes, team, billing, integration logs, email logs, and SMS logs are designed for cloud persistence.
- Page shell: app pages use the shared sidebar and Settings tabs, with Account, Team, Billing, Integrations, Scheduling, Slack, and Telegram under Settings.

## Organization, User, And RLS Architecture Source Of Truth

This section is the required architecture for all future product work.

### Identity

- Users live in Supabase Auth (`auth.users`).
- Application code must identify the current user through the server Supabase client.
- Client-side user identity must never be trusted for writes without server-side validation.
- Service-role access is allowed only in server-only code paths for controlled administrative workflows.

### Tenancy

- `tenants` is the canonical tenant root table.
- `tenant_memberships` connects users to tenants.
- `organizations` and `organization_memberships` remain compatibility tables for existing Funnel code and are synced to canonical tenant tables.
- Valid membership roles are `owner`, `admin`, `member`, and `viewer`.
- Every persistent product/business table must include `tenant_id uuid not null references public.tenants(id) on delete cascade`, unless the table is a documented global catalog. Existing tables may also include `organization_id` while legacy code is being migrated.
- Every query for tenant data must filter by the active organization.
- Every write must set or validate `organization_id` from server-side membership context, not from untrusted client input.

### RLS Requirements

- RLS must be enabled for every database-backed product table.
- Member read policies must require membership in the target `organization_id`.
- Insert policies must require membership in the target `organization_id`; user-owned rows should also validate `created_by = auth.uid()` when the table has a creator.
- Update policies must require membership in the target `organization_id`; user-updated rows should validate `updated_by = auth.uid()` when the table has an updater.
- Delete policies must be explicit. If deletes are allowed, they must require organization membership and should be limited to owner/admin roles for destructive records.
- Global catalog tables may allow authenticated read access only when they contain no customer data.
- Integration secrets must never be readable by regular authenticated users. They are service-only records.

### Required Columns For Persistent Product Tables

Persistent customer/business tables should include:

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null`
- `created_by uuid references auth.users(id) on delete set null default auth.uid()`
- `updated_by uuid references auth.users(id) on delete set null default auth.uid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Tables should use the shared `touch_updated_at()` trigger for `updated_at`.

### Current Tenant-Scoped Tables

- `company_contexts`
- `company_context_versions`
- `funnels`
- `funnel_steps`
- `funnel_launch_runs`
- `funnel_asset_runs`
- `workspace_ai_training`
- `funnel_learning_items`
- `funnel_ai_outputs`
- `workspace_notes`
- `credit_accounts`
- `credit_ledger_entries`
- `integration_connections`
- `integration_messages`
- `integration_processed_events`
- `integration_secrets`
- `telegram_link_codes`
- `billing_customers`
- `subscriptions`
- `email_messages`
- `sms_messages`
- `organization_invitations`
- `user_sidebar_preferences`
- `leads`
- `management_weekly_reviews`
- `management_start_stop_keep_items`
- `management_diamond_entries`
- `management_team_ratings`
- `meetings`
- `meeting_attendees`
- `meeting_agenda_items`
- `meeting_action_items`
- `meeting_decisions`
- `meeting_training_items`

### Current Global Catalog Tables

- `funnel_templates`
- `pre_made_ai_definitions`

### Server Flow For New Features

1. Read the current user from Supabase Auth.
2. Resolve or create the active organization through `getOrCreateDefaultOrganization`.
3. Validate membership and role when needed.
4. Read/write only rows for that organization.
5. Persist data to Supabase before returning success.
6. Return an error if persistence fails; never silently fall back to local-only storage.

### Client Flow For New Features

- UI may keep temporary form state while the user is editing.
- UI must call a server route or server action to save.
- UI must show save errors.
- UI must never treat unsaved client state as durable data.
- Browser local storage, session storage, IndexedDB, static JSON, and local files are forbidden for app persistence.

## Existing API Routes

| Area | Routes |
| --- | --- |
| AI | `POST /api/ai/run`, `PUT /api/ai/training` |
| Context Docs | `GET/POST/PATCH/DELETE /api/contexts`, `PUT /api/company-context` |
| Funnels | `GET/POST/PATCH/DELETE /api/funnels`, `PUT /api/funnels/[type]/steps`, `POST /api/funnels/[id]/launch` |
| Inspiration | `POST /api/inspiration` |
| Learning | `PUT /api/learning` |
| Notes | `POST /api/notes`, `PUT /api/notes`, `DELETE /api/notes` |
| Management | `POST /api/management` |
| Meetings | `POST /api/meetings` |
| Billing | `POST /api/billing/checkout`, `POST /api/billing/credits/checkout`, `POST /api/stripe/webhook` |
| Email | `POST /api/email/send` |
| SMS | `POST /api/sms/send` |
| Slack | `GET /api/integrations/slack/oauth/start`, `GET /api/integrations/slack/oauth/callback`, `POST /api/integrations/slack/events`, `POST /api/integrations/slack/interactions` |
| Telegram | `POST /api/integrations/telegram/link-code`, `POST /api/integrations/telegram/webhook`, `GET /api/integrations/telegram/status`, `POST /api/integrations/telegram/disconnect` |
| Team | `POST /api/settings/team/invitations`, `PATCH /api/settings/team/invitations/[id]`, `POST /api/team/invitations/accept` |
| Auth | `GET /auth/callback` |
| User Preferences | `GET/PUT /api/settings/sidebar-order` |

## Environment Variables Present In Vercel

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Site URL: `NEXT_PUBLIC_SITE_URL`
- Auth bypass: `DISABLE_LOGIN_AUTH`, `AUTH_BYPASS_EMAIL`, `AUTH_BYPASS_TENANT_ID`, `AUTH_BYPASS_USER_ID`
- Claude: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`
- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Roezan: `ROEZAN_API_KEY`

## Environment Variables Still Needed

Stripe billing is implemented but blocked until these are added in Vercel:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ONBOARDING_PRICE_ID`
- `STRIPE_CREDIT_PACK_STARTER_PRICE_ID`
- `STRIPE_CREDIT_PACK_GROWTH_PRICE_ID`

Slack is implemented but blocked until these are added in Vercel:

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_SCOPES`

Telegram is implemented but blocked until these are added in Vercel:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`

Production auth must be restored before customer launch:

- Set `DISABLE_LOGIN_AUTH=false` or remove it from Production.

## APIs We Have

- Supabase database/auth/admin client
- Claude API through Anthropic
- Resend email
- Roezan SMS
- Stripe billing code paths
- Slack OAuth/events/interactions code paths
- Telegram link-code/webhook/status/disconnect code paths

## APIs We Need To Finish Configuring

- Stripe live/test keys, webhook secret, price ID, and webhook endpoint registration
- Slack app credentials, scopes, event subscription URL, and interaction URL
- Telegram bot token, bot username, webhook secret, and webhook registration
- Production auth switch from bypass mode to real Supabase auth
