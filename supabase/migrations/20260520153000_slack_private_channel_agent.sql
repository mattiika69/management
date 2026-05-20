create table if not exists public.slack_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slack_team_id text not null,
  slack_channel_id text not null,
  slack_channel_name text,
  is_private boolean not null default true,
  enabled boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slack_channels_tenant_org_match check (tenant_id = organization_id),
  unique (slack_team_id, slack_channel_id)
);

create table if not exists public.slack_agent_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slack_team_id text not null,
  slack_channel_id text not null,
  slack_user_id text,
  slack_user_name text,
  message_text text not null default '',
  response_text text not null default '',
  command text,
  status text not null default 'sent'
    check (status in ('received', 'sent', 'saved', 'failed', 'ignored', 'needs_confirmation')),
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint slack_agent_messages_tenant_org_match check (tenant_id = organization_id),
  constraint slack_agent_messages_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.slack_agent_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slack_team_id text not null,
  slack_channel_id text not null,
  slack_user_id text,
  slack_user_name text,
  action_type text not null,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'sent'
    check (status in ('sent', 'saved', 'failed', 'ignored', 'needs_confirmation')),
  error text,
  requires_confirmation boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint slack_agent_actions_tenant_org_match check (tenant_id = organization_id),
  constraint slack_agent_actions_input_object check (jsonb_typeof(input) = 'object'),
  constraint slack_agent_actions_result_object check (jsonb_typeof(result) = 'object')
);

create table if not exists public.slack_action_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_type text not null default 'slack_user',
  actor_id text not null,
  slack_team_id text not null,
  slack_channel_id text not null,
  slack_user_id text,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint slack_action_audit_logs_tenant_org_match check (tenant_id = organization_id),
  constraint slack_action_audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists slack_channels_team_channel_idx
on public.slack_channels (slack_team_id, slack_channel_id)
where enabled = true;

create index if not exists slack_channels_tenant_idx
on public.slack_channels (tenant_id, created_at desc);

create index if not exists slack_agent_messages_tenant_created_idx
on public.slack_agent_messages (tenant_id, created_at desc);

create index if not exists slack_agent_messages_channel_created_idx
on public.slack_agent_messages (slack_team_id, slack_channel_id, created_at desc);

create index if not exists slack_agent_actions_tenant_created_idx
on public.slack_agent_actions (tenant_id, created_at desc);

create index if not exists slack_action_audit_logs_tenant_created_idx
on public.slack_action_audit_logs (tenant_id, created_at desc);

drop trigger if exists touch_slack_channels_updated_at on public.slack_channels;
create trigger touch_slack_channels_updated_at
before update on public.slack_channels
for each row execute function public.touch_updated_at();

alter table public.slack_channels enable row level security;
alter table public.slack_agent_messages enable row level security;
alter table public.slack_agent_actions enable row level security;
alter table public.slack_action_audit_logs enable row level security;

drop policy if exists "Tenant members can read Slack channels" on public.slack_channels;
create policy "Tenant members can read Slack channels"
on public.slack_channels
for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Tenant admins can manage Slack channels" on public.slack_channels;
create policy "Tenant admins can manage Slack channels"
on public.slack_channels
for all
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can read Slack agent messages" on public.slack_agent_messages;
create policy "Tenant admins can read Slack agent messages"
on public.slack_agent_messages
for select
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can read Slack agent actions" on public.slack_agent_actions;
create policy "Tenant admins can read Slack agent actions"
on public.slack_agent_actions
for select
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can read Slack action audit logs" on public.slack_action_audit_logs;
create policy "Tenant admins can read Slack action audit logs"
on public.slack_action_audit_logs
for select
to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

grant select on public.slack_channels to authenticated;
grant insert, update, delete on public.slack_channels to authenticated;
grant select on public.slack_agent_messages to authenticated;
grant select on public.slack_agent_actions to authenticated;
grant select on public.slack_action_audit_logs to authenticated;
grant all on public.slack_channels to service_role;
grant all on public.slack_agent_messages to service_role;
grant all on public.slack_agent_actions to service_role;
grant all on public.slack_action_audit_logs to service_role;
