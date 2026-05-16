create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  role_title text not null default '',
  department text not null default '',
  employment_status text not null default 'active'
    check (employment_status in ('active', 'onboarding', 'contractor', 'inactive')),
  calendar_email text,
  timezone text not null default 'America/New_York',
  start_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_tenant_org_match check (tenant_id = organization_id)
);

create unique index if not exists employees_tenant_email_active_idx
on public.employees (tenant_id, lower(email))
where email is not null and archived_at is null;

create index if not exists employees_tenant_status_name_idx
on public.employees (tenant_id, employment_status, full_name)
where archived_at is null;

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft', 'apple', 'caldav', 'other')),
  display_name text not null,
  account_email text not null,
  provider_account_id text,
  sync_direction text not null default 'two_way'
    check (sync_direction in ('two_way', 'import_only', 'export_only')),
  sync_enabled boolean not null default true,
  include_events boolean not null default true,
  include_tasks boolean not null default false,
  color text not null default '#2563eb',
  status text not null default 'connected'
    check (status in ('connected', 'needs_reauth', 'paused')),
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_connections_tenant_org_match check (tenant_id = organization_id)
);

create unique index if not exists calendar_connections_tenant_provider_email_active_idx
on public.calendar_connections (tenant_id, provider, lower(account_email))
where archived_at is null;

create index if not exists calendar_connections_tenant_status_idx
on public.calendar_connections (tenant_id, status, created_at desc)
where archived_at is null;

create table if not exists public.zoom_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  account_email text not null,
  zoom_account_id text,
  sync_enabled boolean not null default true,
  cloud_recording_sync boolean not null default false,
  default_meeting_duration_minutes integer not null default 30
    check (default_meeting_duration_minutes between 5 and 480),
  status text not null default 'connected'
    check (status in ('connected', 'needs_reauth', 'paused')),
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoom_connections_tenant_org_match check (tenant_id = organization_id)
);

create unique index if not exists zoom_connections_tenant_email_active_idx
on public.zoom_connections (tenant_id, lower(account_email))
where archived_at is null;

create index if not exists zoom_connections_tenant_status_idx
on public.zoom_connections (tenant_id, status, created_at desc)
where archived_at is null;

create table if not exists public.management_job_descriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  department text not null default '',
  reports_to text not null default '',
  responsibilities text not null default '',
  requirements text not null default '',
  scorecard text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_job_descriptions_tenant_org_match check (tenant_id = organization_id)
);

create index if not exists management_job_descriptions_tenant_status_idx
on public.management_job_descriptions (tenant_id, status, title)
where archived_at is null;

create table if not exists public.management_hiring_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_description_id uuid references public.management_job_descriptions(id) on delete set null,
  full_name text not null,
  email text,
  stage text not null default 'sourced'
    check (stage in ('sourced', 'screening', 'interviewing', 'offer', 'hired', 'rejected')),
  rating numeric(4, 1),
  notes text not null default '',
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_hiring_candidates_tenant_org_match check (tenant_id = organization_id)
);

create index if not exists management_hiring_candidates_tenant_stage_idx
on public.management_hiring_candidates (tenant_id, stage, created_at desc)
where archived_at is null;

create table if not exists public.management_training_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  owner_name text not null default '',
  outcomes text not null default '',
  cadence text not null default 'weekly',
  status text not null default 'active' check (status in ('active', 'paused', 'complete', 'archived')),
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_training_programs_tenant_org_match check (tenant_id = organization_id)
);

create index if not exists management_training_programs_tenant_status_idx
on public.management_training_programs (tenant_id, status, created_at desc)
where archived_at is null;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'employees',
    'calendar_connections',
    'zoom_connections',
    'management_job_descriptions',
    'management_hiring_candidates',
    'management_training_programs'
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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'employees',
    'calendar_connections',
    'zoom_connections',
    'management_job_descriptions',
    'management_hiring_candidates',
    'management_training_programs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Tenant members can read rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant members can read rows" on public.%I for select to authenticated using (public.is_tenant_member(tenant_id))',
      table_name
    );
    execute format('drop policy if exists "Tenant admins can create rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant admins can create rows" on public.%I for insert to authenticated with check (public.has_tenant_role(tenant_id, array[''owner'', ''admin'']))',
      table_name
    );
    execute format('drop policy if exists "Tenant admins can update rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant admins can update rows" on public.%I for update to authenticated using (public.has_tenant_role(tenant_id, array[''owner'', ''admin''])) with check (public.has_tenant_role(tenant_id, array[''owner'', ''admin'']))',
      table_name
    );
    execute format('drop policy if exists "Tenant admins can delete rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant admins can delete rows" on public.%I for delete to authenticated using (public.has_tenant_role(tenant_id, array[''owner'', ''admin'']))',
      table_name
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end $$;
