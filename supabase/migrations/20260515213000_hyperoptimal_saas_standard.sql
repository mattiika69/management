create extension if not exists pgcrypto with schema extensions;

alter table public.organization_memberships
  drop constraint if exists organization_memberships_role_check;

alter table public.organization_memberships
  add constraint organization_memberships_role_check
  check (role in ('owner', 'admin', 'member', 'viewer'));

alter table public.organization_invitations
  drop constraint if exists organization_invitations_role_check;

alter table public.organization_invitations
  add constraint organization_invitations_role_check
  check (role in ('admin', 'member', 'viewer'));

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  stripe_seat_status text not null default 'active',
  invited_by_user_id uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  token_hash text not null unique,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  email_delivery_status text not null default 'pending' check (email_delivery_status in ('pending', 'sent', 'failed')),
  email_error_message text,
  stripe_seat_reserved boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_invitations_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create unique index if not exists tenant_invitations_open_email_idx
  on public.tenant_invitations (tenant_id, lower(email))
  where accepted_at is null and revoked_at is null;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  request_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  plan_key text,
  price_id text,
  seat_quantity integer not null default 1 check (seat_quantity >= 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscription_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  billing_subscription_id uuid references public.billing_subscriptions(id) on delete cascade,
  stripe_subscription_item_id text unique,
  price_id text not null,
  quantity integer not null default 1 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  provider text not null default 'stripe',
  event_id text not null unique,
  event_type text not null,
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_usage_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  usage_key text not null,
  quantity integer not null default 1 check (quantity > 0),
  stripe_usage_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.slack_installations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slack_team_id text not null,
  slack_team_name text,
  bot_user_id text,
  installed_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slack_team_id)
);

create table if not exists public.slack_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  slack_team_id text not null,
  slack_user_id text,
  slack_channel_id text,
  display_name text,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  telegram_user_id text,
  telegram_chat_id text not null,
  display_name text,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, telegram_chat_id)
);

create table if not exists public.integration_inbound_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  provider text not null check (provider in ('slack', 'telegram')),
  provider_event_id text not null,
  provider_team_id text,
  provider_channel_id text,
  provider_user_id text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, dedupe_key)
);

create table if not exists public.integration_outbound_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('slack', 'telegram')),
  target_id text not null,
  message_text text not null default '',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  lineage_key text,
  loop_prevention_key text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_command_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('slack', 'telegram')),
  external_user_id text,
  external_channel_id text,
  command_family text not null,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_channel_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_provider text not null check (source_provider in ('slack', 'telegram')),
  source_channel_id text not null,
  target_provider text not null check (target_provider in ('slack', 'telegram')),
  target_channel_id text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, source_provider, source_channel_id, target_provider, target_channel_id)
);

create table if not exists public.integration_routing_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  source_provider text not null check (source_provider in ('slack', 'telegram')),
  target_provider text not null check (target_provider in ('slack', 'telegram')),
  rule_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_delivery_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('slack', 'telegram')),
  target_id text,
  preferences jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, target_id)
);

create table if not exists public.integration_workflow_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  workflow_key text not null,
  target_providers text[] not null default '{}',
  slack_channel_id text,
  telegram_chat_id text,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly', 'custom')),
  custom_cron text,
  timezone text not null default 'America/New_York',
  message_template text,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  archived_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  schedule_id uuid references public.integration_workflow_schedules(id) on delete set null,
  workflow_key text not null,
  target_provider text check (target_provider in ('slack', 'telegram', 'both')),
  target_id text,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  output_metadata jsonb not null default '{}'::jsonb,
  provider_delivery_ids jsonb not null default '[]'::jsonb,
  idempotency_key text,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integration_workflow_runs_idempotency_idx
  on public.integration_workflow_runs (tenant_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.integration_workflow_run_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.integration_workflow_runs(id) on delete cascade,
  event_type text not null,
  status text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  source_provider text check (source_provider in ('web', 'slack', 'telegram')),
  request_text text not null,
  risk_level text not null default 'normal' check (risk_level in ('low', 'normal', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'running', 'completed', 'cancelled', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_id uuid references public.agent_requests(id) on delete cascade,
  action_type text not null,
  status text not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_id uuid not null references public.agent_requests(id) on delete cascade,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_code_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_id uuid references public.agent_requests(id) on delete set null,
  github_repo text,
  branch_name text,
  commit_sha text,
  pull_request_url text,
  status text not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_deployments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_id uuid references public.agent_requests(id) on delete set null,
  github_commit_sha text,
  deployment_url text,
  provider text not null default 'vercel',
  status text not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_tool_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_id uuid references public.agent_requests(id) on delete set null,
  tool_name text not null,
  allowed boolean not null default false,
  status text not null default 'queued',
  input_metadata jsonb not null default '{}'::jsonb,
  output_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tenants (id, name, slug, owner_user_id, created_at, updated_at)
select id, name, slug, owner_id, created_at, updated_at
from public.organizations
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  owner_user_id = excluded.owner_user_id,
  updated_at = excluded.updated_at;

insert into public.tenant_memberships (tenant_id, user_id, role, created_at)
select organization_id, user_id, role, created_at
from public.organization_memberships
on conflict (tenant_id, user_id) do update set
  role = excluded.role,
  updated_at = now();

create or replace function public.sync_organization_to_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenants (id, name, slug, owner_user_id, created_at, updated_at)
  values (new.id, new.name, new.slug, new.owner_id, new.created_at, new.updated_at)
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    owner_user_id = excluded.owner_user_id,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_tenant_to_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into public.organizations (id, name, slug, owner_id, created_at, updated_at)
  values (new.id, new.name, new.slug, new.owner_user_id, new.created_at, new.updated_at)
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    owner_id = excluded.owner_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_organization_to_tenant on public.organizations;
create trigger sync_organization_to_tenant
after insert or update on public.organizations
for each row execute function public.sync_organization_to_tenant();

drop trigger if exists sync_tenant_to_organization on public.tenants;
create trigger sync_tenant_to_organization
after insert or update on public.tenants
for each row execute function public.sync_tenant_to_organization();

create or replace function public.sync_organization_membership_to_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.tenant_memberships
    where tenant_id = old.organization_id and user_id = old.user_id;
    return old;
  end if;

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    created_at,
    updated_at
  )
  values (
    new.organization_id,
    new.user_id,
    new.role,
    new.created_at,
    now()
  )
  on conflict (tenant_id, user_id) do update set
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_organization_membership_to_tenant on public.organization_memberships;
create trigger sync_organization_membership_to_tenant
after insert or update or delete on public.organization_memberships
for each row execute function public.sync_organization_membership_to_tenant();

create or replace function public.sync_organization_invitation_to_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.tenant_invitations where id = old.id;
    return old;
  end if;

  insert into public.tenant_invitations (
    id,
    tenant_id,
    email,
    role,
    token_hash,
    invited_by_user_id,
    accepted_by_user_id,
    accepted_at,
    revoked_at,
    expires_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.organization_id,
    new.email,
    new.role,
    new.token_hash,
    new.invited_by,
    new.accepted_by,
    new.accepted_at,
    new.revoked_at,
    new.expires_at,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    email = excluded.email,
    role = excluded.role,
    token_hash = excluded.token_hash,
    invited_by_user_id = excluded.invited_by_user_id,
    accepted_by_user_id = excluded.accepted_by_user_id,
    accepted_at = excluded.accepted_at,
    revoked_at = excluded.revoked_at,
    expires_at = excluded.expires_at,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_organization_invitation_to_tenant on public.organization_invitations;
create trigger sync_organization_invitation_to_tenant
after insert or update or delete on public.organization_invitations
for each row execute function public.sync_organization_invitation_to_tenant();

insert into public.tenant_invitations (
  id,
  tenant_id,
  email,
  role,
  token_hash,
  invited_by_user_id,
  accepted_by_user_id,
  accepted_at,
  revoked_at,
  expires_at,
  created_at,
  updated_at
)
select
  id,
  organization_id,
  email,
  role,
  token_hash,
  invited_by,
  accepted_by,
  accepted_at,
  revoked_at,
  expires_at,
  created_at,
  updated_at
from public.organization_invitations
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  email = excluded.email,
  role = excluded.role,
  token_hash = excluded.token_hash,
  invited_by_user_id = excluded.invited_by_user_id,
  accepted_by_user_id = excluded.accepted_by_user_id,
  accepted_at = excluded.accepted_at,
  revoked_at = excluded.revoked_at,
  expires_at = excluded.expires_at,
  updated_at = now();

create or replace function public.sync_organization_and_tenant_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is null and new.organization_id is not null then
    new.tenant_id = new.organization_id;
  elsif new.organization_id is null and new.tenant_id is not null then
    new.organization_id = new.tenant_id;
  elsif new.tenant_id is distinct from new.organization_id then
    raise exception 'tenant_id and organization_id must match';
  end if;

  return new;
end;
$$;

do $$
declare
  table_record record;
  tenant_constraint_name text;
  tenant_index_name text;
begin
  for table_record in
    select distinct table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'organization_id'
      and table_name not in ('organizations', 'organization_memberships', 'organization_invitations')
  loop
    execute format('alter table public.%I add column if not exists tenant_id uuid', table_record.table_name);
    execute format('update public.%I set tenant_id = organization_id where tenant_id is null and organization_id is not null', table_record.table_name);

    tenant_constraint_name := left(table_record.table_name || '_tenant_id_fkey', 63);
    execute format('alter table public.%I drop constraint if exists %I', table_record.table_name, tenant_constraint_name);
    execute format(
      'alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id) on delete cascade',
      table_record.table_name,
      tenant_constraint_name
    );

    tenant_index_name := left(table_record.table_name || '_tenant_id_idx', 63);
    execute format('create index if not exists %I on public.%I (tenant_id)', tenant_index_name, table_record.table_name);

    execute format('drop trigger if exists sync_organization_and_tenant_columns on public.%I', table_record.table_name);
    execute format(
      'create trigger sync_organization_and_tenant_columns before insert or update on public.%I for each row execute function public.sync_organization_and_tenant_columns()',
      table_record.table_name
    );
  end loop;
end $$;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, display_name, metadata)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists handle_auth_user_profile on auth.users;
create trigger handle_auth_user_profile
after insert or update on auth.users
for each row execute function public.handle_auth_user_profile();

insert into public.user_profiles (user_id, email, display_name, metadata)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name'),
  coalesce(raw_user_meta_data, '{}'::jsonb)
from auth.users
on conflict (user_id) do update set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
  metadata = excluded.metadata,
  updated_at = now();

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = auth.uid()
      and membership.archived_at is null
  );
$$;

create or replace function public.has_tenant_role(
  target_tenant_id uuid,
  roles text[]
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = auth.uid()
      and membership.role = any(roles)
      and membership.archived_at is null
  );
$$;

create or replace function public.audit_admin_action(
  target_tenant_id uuid,
  action_name text,
  target_table_name text default null,
  target_record_id text default null,
  metadata_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_id uuid;
begin
  insert into public.admin_audit_log (
    tenant_id,
    actor_user_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    target_tenant_id,
    auth.uid(),
    action_name,
    target_table_name,
    target_record_id,
    coalesce(metadata_payload, '{}'::jsonb)
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.has_tenant_role(uuid, text[]) from public;
revoke all on function public.audit_admin_action(uuid, text, text, text, jsonb) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;
grant execute on function public.audit_admin_action(uuid, text, text, text, jsonb) to authenticated, service_role;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_tenant_member(target_organization_id);
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_tenant_role(target_organization_id, allowed_roles);
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_tenant_role(target_organization_id, array['owner', 'admin']);
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'user_profiles',
    'tenants',
    'tenant_memberships',
    'tenant_invitations',
    'admin_audit_log',
    'billing_subscriptions',
    'billing_subscription_items',
    'billing_events',
    'billing_usage_records',
    'slack_installations',
    'slack_links',
    'telegram_links',
    'integration_inbound_events',
    'integration_outbound_messages',
    'integration_command_sessions',
    'integration_channel_links',
    'integration_routing_rules',
    'integration_delivery_preferences',
    'integration_workflow_schedules',
    'integration_workflow_runs',
    'integration_workflow_run_events',
    'agent_requests',
    'agent_actions',
    'agent_approvals',
    'agent_code_tasks',
    'agent_deployments',
    'agent_tool_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Tenant members can read tenants" on public.tenants;
create policy "Tenant members can read tenants"
on public.tenants for select to authenticated
using (public.is_tenant_member(id));

drop policy if exists "Users can create owned tenants" on public.tenants;
create policy "Users can create owned tenants"
on public.tenants for insert to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "Tenant admins can update tenants" on public.tenants;
create policy "Tenant admins can update tenants"
on public.tenants for update to authenticated
using (public.has_tenant_role(id, array['owner', 'admin']))
with check (public.has_tenant_role(id, array['owner', 'admin']));

drop policy if exists "Tenant members can read memberships" on public.tenant_memberships;
create policy "Tenant members can read memberships"
on public.tenant_memberships for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Tenant admins can manage memberships" on public.tenant_memberships;
create policy "Tenant admins can manage memberships"
on public.tenant_memberships for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can manage invitations" on public.tenant_invitations;
create policy "Tenant admins can manage invitations"
on public.tenant_invitations for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Invitees can read own pending tenant invitations" on public.tenant_invitations;
create policy "Invitees can read own pending tenant invitations"
on public.tenant_invitations for select to authenticated
using (
  accepted_at is null
  and revoked_at is null
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Tenant admins can read audit log" on public.admin_audit_log;
create policy "Tenant admins can read audit log"
on public.admin_audit_log for select to authenticated
using (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can create audit log" on public.admin_audit_log;
create policy "Tenant admins can create audit log"
on public.admin_audit_log for insert to authenticated
with check (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner', 'admin']));

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'billing_subscriptions',
    'billing_subscription_items',
    'billing_usage_records',
    'slack_installations',
    'slack_links',
    'telegram_links',
    'integration_outbound_messages',
    'integration_command_sessions',
    'integration_channel_links',
    'integration_routing_rules',
    'integration_delivery_preferences',
    'integration_workflow_schedules',
    'integration_workflow_runs',
    'integration_workflow_run_events',
    'agent_requests',
    'agent_actions',
    'agent_approvals',
    'agent_code_tasks',
    'agent_deployments',
    'agent_tool_runs'
  ]
  loop
    execute format('drop policy if exists "Tenant members can read rows" on public.%I', table_name);
    execute format('create policy "Tenant members can read rows" on public.%I for select to authenticated using (public.is_tenant_member(tenant_id))', table_name);
    execute format('drop policy if exists "Tenant admins can write rows" on public.%I', table_name);
    execute format('create policy "Tenant admins can write rows" on public.%I for all to authenticated using (public.has_tenant_role(tenant_id, array[''owner'', ''admin''])) with check (public.has_tenant_role(tenant_id, array[''owner'', ''admin'']))', table_name);
  end loop;
end $$;

drop policy if exists "Tenant admins can read billing events" on public.billing_events;
create policy "Tenant admins can read billing events"
on public.billing_events for select to authenticated
using (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can read inbound events" on public.integration_inbound_events;
create policy "Tenant admins can read inbound events"
on public.integration_inbound_events for select to authenticated
using (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner', 'admin']));

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'user_profiles',
    'tenants',
    'tenant_memberships',
    'tenant_invitations',
    'billing_subscriptions',
    'billing_subscription_items',
    'slack_installations',
    'slack_links',
    'telegram_links',
    'integration_outbound_messages',
    'integration_command_sessions',
    'integration_channel_links',
    'integration_routing_rules',
    'integration_delivery_preferences',
    'integration_workflow_schedules',
    'integration_workflow_runs',
    'agent_requests',
    'agent_actions',
    'agent_approvals',
    'agent_code_tasks',
    'agent_deployments',
    'agent_tool_runs'
  ]
  loop
    trigger_name := left('touch_' || table_name || '_updated_at', 63);
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      trigger_name,
      table_name
    );
  end loop;
end $$;

create index if not exists tenant_memberships_user_idx on public.tenant_memberships (user_id);
create index if not exists tenant_invitations_tenant_created_idx on public.tenant_invitations (tenant_id, created_at desc);
create index if not exists admin_audit_log_tenant_created_idx on public.admin_audit_log (tenant_id, created_at desc);
create index if not exists billing_subscriptions_tenant_idx on public.billing_subscriptions (tenant_id, created_at desc);
create index if not exists billing_usage_records_tenant_idx on public.billing_usage_records (tenant_id, created_at desc);
create index if not exists slack_links_tenant_idx on public.slack_links (tenant_id, slack_team_id, slack_channel_id);
create index if not exists telegram_links_tenant_idx on public.telegram_links (tenant_id, telegram_chat_id);
create index if not exists integration_inbound_events_created_idx on public.integration_inbound_events (created_at desc);
create index if not exists integration_outbound_messages_tenant_idx on public.integration_outbound_messages (tenant_id, created_at desc);
create index if not exists integration_workflow_schedules_tenant_idx on public.integration_workflow_schedules (tenant_id, archived_at, enabled);
create index if not exists integration_workflow_runs_tenant_idx on public.integration_workflow_runs (tenant_id, created_at desc);
create index if not exists agent_requests_tenant_idx on public.agent_requests (tenant_id, created_at desc);

grant usage on schema public to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update on public.tenants to authenticated;
grant select, insert, update, delete on public.tenant_memberships to authenticated;
grant select, insert, update, delete on public.tenant_invitations to authenticated;
grant select, insert on public.admin_audit_log to authenticated;
grant select, insert, update, delete on public.billing_subscriptions to authenticated;
grant select, insert, update, delete on public.billing_subscription_items to authenticated;
grant select on public.billing_events to authenticated;
grant select, insert on public.billing_usage_records to authenticated;
grant select, insert, update, delete on public.slack_installations to authenticated;
grant select, insert, update, delete on public.slack_links to authenticated;
grant select, insert, update, delete on public.telegram_links to authenticated;
grant select on public.integration_inbound_events to authenticated;
grant select, insert, update, delete on public.integration_outbound_messages to authenticated;
grant select, insert, update, delete on public.integration_command_sessions to authenticated;
grant select, insert, update, delete on public.integration_channel_links to authenticated;
grant select, insert, update, delete on public.integration_routing_rules to authenticated;
grant select, insert, update, delete on public.integration_delivery_preferences to authenticated;
grant select, insert, update, delete on public.integration_workflow_schedules to authenticated;
grant select, insert, update, delete on public.integration_workflow_runs to authenticated;
grant select, insert, update, delete on public.integration_workflow_run_events to authenticated;
grant select, insert, update, delete on public.agent_requests to authenticated;
grant select, insert, update, delete on public.agent_actions to authenticated;
grant select, insert, update, delete on public.agent_approvals to authenticated;
grant select, insert, update, delete on public.agent_code_tasks to authenticated;
grant select, insert, update, delete on public.agent_deployments to authenticated;
grant select, insert, update, delete on public.agent_tool_runs to authenticated;
