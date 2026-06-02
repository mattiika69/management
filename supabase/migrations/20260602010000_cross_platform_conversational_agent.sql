create table if not exists public.platform_installations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('web', 'slack', 'telegram')),
  external_team_id text,
  external_channel_id text,
  bot_user_id text,
  installing_user_id uuid references auth.users(id) on delete set null,
  scopes text[] not null default '{}'::text[],
  token_reference text,
  status text not null default 'active' check (status in ('active', 'revoked', 'disabled')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_installations_tenant_org_match check (tenant_id = organization_id),
  constraint platform_installations_config_object check (jsonb_typeof(config) = 'object')
);

create unique index if not exists platform_installations_unique_idx
on public.platform_installations (
  tenant_id,
  platform,
  coalesce(external_team_id, ''),
  coalesce(external_channel_id, '')
)
where status = 'active';

create table if not exists public.platform_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('web', 'slack', 'telegram')),
  external_team_id text,
  external_user_id text not null,
  app_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  status text not null default 'linked' check (status in ('linked', 'revoked')),
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_accounts_tenant_org_match check (tenant_id = organization_id),
  constraint platform_accounts_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists platform_accounts_unique_idx
on public.platform_accounts (
  tenant_id,
  platform,
  coalesce(external_team_id, ''),
  external_user_id
)
where status = 'linked';

create table if not exists public.platform_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('web', 'slack', 'telegram')),
  installation_id uuid references public.platform_installations(id) on delete set null,
  external_team_id text,
  external_channel_id text,
  external_thread_id text,
  conversation_type text not null default 'chat'
    check (conversation_type in ('chat', 'dm', 'channel', 'group', 'supergroup', 'thread', 'web')),
  title text,
  status text not null default 'active' check (status in ('active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_conversations_tenant_org_match check (tenant_id = organization_id),
  constraint platform_conversations_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists platform_conversations_unique_idx
on public.platform_conversations (
  tenant_id,
  platform,
  coalesce(external_team_id, ''),
  coalesce(external_channel_id, ''),
  coalesce(external_thread_id, '')
)
where status = 'active';

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.platform_conversations(id) on delete set null,
  platform text not null check (platform in ('web', 'slack', 'telegram')),
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  external_user_id text,
  external_message_id text,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_messages_tenant_org_match check (tenant_id = organization_id),
  constraint agent_messages_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.capability_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('web', 'slack', 'telegram')),
  capability text not null,
  target_type text,
  target_id text,
  allowed boolean not null default false,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  checked_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint capability_checks_tenant_org_match check (tenant_id = organization_id),
  constraint capability_checks_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_platform text not null default 'web' check (actor_platform in ('web', 'slack', 'telegram', 'system')),
  external_actor_id text,
  action text not null,
  target_table text,
  target_id text,
  before_values jsonb,
  after_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_tenant_org_match check (tenant_id = organization_id),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

alter table public.agent_tool_runs
  add column if not exists conversation_id uuid references public.platform_conversations(id) on delete set null,
  add column if not exists message_id uuid references public.agent_messages(id) on delete set null,
  add column if not exists platform text check (platform in ('web', 'slack', 'telegram')),
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists tool_call_id text,
  add column if not exists requires_confirmation boolean not null default false,
  add column if not exists approval_id uuid references public.agent_approvals(id) on delete set null,
  add column if not exists target_table text,
  add column if not exists target_id text,
  add column if not exists before_values jsonb,
  add column if not exists after_values jsonb;

alter table public.agent_approvals
  add column if not exists conversation_id uuid references public.platform_conversations(id) on delete set null,
  add column if not exists platform text check (platform in ('web', 'slack', 'telegram')),
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists external_actor_id text,
  add column if not exists tool_name text,
  add column if not exists tool_input jsonb not null default '{}'::jsonb,
  add column if not exists confirmed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');

create index if not exists platform_installations_tenant_idx
on public.platform_installations (tenant_id, platform, created_at desc);

create index if not exists platform_accounts_user_idx
on public.platform_accounts (tenant_id, app_user_id, platform);

create index if not exists platform_conversations_tenant_idx
on public.platform_conversations (tenant_id, platform, created_at desc);

create index if not exists agent_messages_conversation_idx
on public.agent_messages (conversation_id, created_at desc);

create index if not exists agent_tool_runs_conversation_idx
on public.agent_tool_runs (conversation_id, created_at desc);

create index if not exists agent_approvals_conversation_idx
on public.agent_approvals (conversation_id, created_at desc);

create index if not exists capability_checks_tenant_idx
on public.capability_checks (tenant_id, platform, created_at desc);

create index if not exists audit_logs_tenant_created_idx
on public.audit_logs (tenant_id, created_at desc);

drop trigger if exists touch_platform_installations_updated_at on public.platform_installations;
create trigger touch_platform_installations_updated_at
before update on public.platform_installations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_platform_accounts_updated_at on public.platform_accounts;
create trigger touch_platform_accounts_updated_at
before update on public.platform_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists touch_platform_conversations_updated_at on public.platform_conversations;
create trigger touch_platform_conversations_updated_at
before update on public.platform_conversations
for each row execute function public.touch_updated_at();

alter table public.platform_installations enable row level security;
alter table public.platform_accounts enable row level security;
alter table public.platform_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.capability_checks enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'platform_installations',
    'platform_accounts',
    'platform_conversations',
    'agent_messages',
    'capability_checks',
    'audit_logs'
  ]
  loop
    execute format('drop policy if exists "Tenant members can read rows" on public.%I', table_name);
    execute format('create policy "Tenant members can read rows" on public.%I for select to authenticated using (public.is_tenant_member(tenant_id))', table_name);
    execute format('drop policy if exists "Tenant admins can write rows" on public.%I', table_name);
    execute format('create policy "Tenant admins can write rows" on public.%I for all to authenticated using (public.has_tenant_role(tenant_id, array[''owner'', ''admin''])) with check (public.has_tenant_role(tenant_id, array[''owner'', ''admin'']))', table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.platform_installations to authenticated;
grant select, insert, update, delete on public.platform_accounts to authenticated;
grant select, insert, update, delete on public.platform_conversations to authenticated;
grant select, insert, update, delete on public.agent_messages to authenticated;
grant select, insert, update, delete on public.capability_checks to authenticated;
grant select, insert on public.audit_logs to authenticated;

grant all on public.platform_installations to service_role;
grant all on public.platform_accounts to service_role;
grant all on public.platform_conversations to service_role;
grant all on public.agent_messages to service_role;
grant all on public.capability_checks to service_role;
grant all on public.audit_logs to service_role;
