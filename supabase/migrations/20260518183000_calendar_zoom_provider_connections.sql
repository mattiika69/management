create table if not exists public.connected_account_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('google_calendar', 'microsoft_calendar', 'zoom')),
  connection_id uuid,
  account_email text not null,
  account_id text,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_type text,
  scope text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connected_account_tokens_tenant_org_match check (tenant_id = organization_id)
);

create unique index if not exists connected_account_tokens_active_account_idx
on public.connected_account_tokens (tenant_id, provider, lower(account_email))
where archived_at is null;

create index if not exists connected_account_tokens_connection_idx
on public.connected_account_tokens (tenant_id, provider, connection_id)
where archived_at is null;

create table if not exists public.calendar_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete set null,
  calendar_connection_id uuid references public.calendar_connections(id) on delete set null,
  zoom_connection_id uuid references public.zoom_connections(id) on delete set null,
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'America/New_York',
  location text not null default '',
  meeting_url text,
  recipient_emails text[] not null default array[]::text[],
  provider_event_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_count integer not null default 0 check (sent_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_invites_tenant_org_match check (tenant_id = organization_id),
  constraint calendar_invites_date_order check (end_at > start_at)
);

create index if not exists calendar_invites_tenant_created_idx
on public.calendar_invites (tenant_id, created_at desc)
where archived_at is null;

create table if not exists public.zoom_recordings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zoom_connection_id uuid references public.zoom_connections(id) on delete set null,
  meeting_uuid text not null,
  meeting_id text,
  topic text not null default '',
  start_time timestamptz,
  duration_minutes integer,
  recording_count integer not null default 0 check (recording_count >= 0),
  share_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoom_recordings_tenant_org_match check (tenant_id = organization_id)
);

create unique index if not exists zoom_recordings_unique_meeting_idx
on public.zoom_recordings (tenant_id, zoom_connection_id, meeting_uuid);

create index if not exists zoom_recordings_tenant_start_idx
on public.zoom_recordings (tenant_id, start_time desc)
where archived_at is null;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'connected_account_tokens',
    'calendar_invites',
    'zoom_recordings'
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

alter table public.connected_account_tokens enable row level security;
alter table public.calendar_invites enable row level security;
alter table public.zoom_recordings enable row level security;

drop policy if exists "Tenant members can read calendar invites" on public.calendar_invites;
create policy "Tenant members can read calendar invites"
on public.calendar_invites for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Tenant members can create calendar invites" on public.calendar_invites;
create policy "Tenant members can create calendar invites"
on public.calendar_invites for insert to authenticated
with check (public.is_tenant_member(tenant_id) and created_by_user_id = auth.uid());

drop policy if exists "Tenant senders can update calendar invites" on public.calendar_invites;
create policy "Tenant senders can update calendar invites"
on public.calendar_invites for update to authenticated
using (public.is_tenant_member(tenant_id) and created_by_user_id = auth.uid())
with check (public.is_tenant_member(tenant_id) and created_by_user_id = auth.uid());

drop policy if exists "Tenant members can read zoom recordings" on public.zoom_recordings;
create policy "Tenant members can read zoom recordings"
on public.zoom_recordings for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Tenant admins can create zoom recordings" on public.zoom_recordings;
create policy "Tenant admins can create zoom recordings"
on public.zoom_recordings for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can update zoom recordings" on public.zoom_recordings;
create policy "Tenant admins can update zoom recordings"
on public.zoom_recordings for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

grant select, insert, update on public.calendar_invites to authenticated;
grant select, insert, update on public.zoom_recordings to authenticated;
grant all on public.connected_account_tokens to service_role;
grant all on public.calendar_invites to service_role;
grant all on public.zoom_recordings to service_role;
