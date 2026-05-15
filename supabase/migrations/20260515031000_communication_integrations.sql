create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('slack', 'telegram')),
  external_team_id text,
  external_channel_id text,
  bot_user_id text,
  display_name text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_team_id, external_channel_id)
);

create table if not exists public.integration_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete set null,
  provider text not null check (provider in ('slack', 'telegram')),
  direction text not null check (direction in ('inbound', 'outbound')),
  external_team_id text,
  external_channel_id text,
  external_user_id text,
  external_message_id text,
  message_text text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.integration_connections enable row level security;
alter table public.integration_messages enable row level security;

drop trigger if exists touch_integration_connections_updated_at on public.integration_connections;
create trigger touch_integration_connections_updated_at
before update on public.integration_connections
for each row execute function public.touch_updated_at();

drop policy if exists "Members can read integration connections" on public.integration_connections;
create policy "Members can read integration connections"
on public.integration_connections
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = integration_connections.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Owners can manage integration connections" on public.integration_connections;
create policy "Owners can manage integration connections"
on public.integration_connections
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = integration_connections.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = integration_connections.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Members can read integration messages" on public.integration_messages;
create policy "Members can read integration messages"
on public.integration_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = integration_messages.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Members can create outbound integration messages" on public.integration_messages;
create policy "Members can create outbound integration messages"
on public.integration_messages
for insert
to authenticated
with check (
  direction = 'outbound'
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = integration_messages.organization_id
      and membership.user_id = auth.uid()
  )
);
