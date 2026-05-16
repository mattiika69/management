create table if not exists public.management_weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  subject_key text not null,
  subject_name text not null,
  week_start date not null,
  start_stop_keep_complete boolean not null default false,
  progress_complete boolean not null default false,
  management_diamond_complete boolean not null default false,
  team_rating_complete boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, subject_key, week_start),
  constraint management_weekly_reviews_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.management_start_stop_keep_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  subject_key text not null,
  subject_name text not null,
  week_start date not null,
  category text not null check (category in ('start', 'stop', 'keep')),
  item_text text not null,
  completed boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_ssk_items_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.management_diamond_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  subject_key text not null,
  subject_name text not null,
  week_start date not null,
  day_index integer not null check (day_index between 0 and 6),
  task text not null default '',
  task_time text not null default '',
  finished boolean not null default false,
  why_not text not null default '',
  how_to_fix text not null default '',
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, subject_key, week_start, day_index),
  constraint management_diamond_entries_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.management_team_ratings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  subject_key text not null,
  subject_name text not null,
  week_start date not null,
  current_week_score numeric(4, 1),
  four_week_average numeric(4, 1),
  attitude_score numeric(4, 1),
  participation_score numeric(4, 1),
  work_quantity_score numeric(4, 1),
  work_quality_score numeric(4, 1),
  improvement_score numeric(4, 1),
  trend numeric(5, 1),
  notes text not null default '',
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, subject_key, week_start),
  constraint management_team_ratings_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_type text not null check (meeting_type in ('team', 'training', 'one_on_one', 'client', 'planning')),
  title text not null,
  meeting_date date not null default current_date,
  owner_user_id uuid references auth.users(id) on delete set null,
  employee_user_id uuid references auth.users(id) on delete set null,
  client_name text,
  next_meeting_date date,
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text,
  created_at timestamptz not null default now(),
  unique (meeting_id, user_id),
  constraint meeting_attendees_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  item_order integer not null default 0,
  title text not null default '',
  audience text not null default 'All',
  minutes integer not null default 5 check (minutes >= 0),
  completed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_agenda_items_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  item_order integer not null default 0,
  title text not null default '',
  owner_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  add_to_calendar boolean not null default false,
  completed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_action_items_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  item_order integer not null default 0,
  decision_text text not null default '',
  accepted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_decisions_tenant_org_match check (tenant_id = organization_id)
);

create table if not exists public.meeting_training_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  item_order integer not null default 0,
  trainee_user_id uuid references auth.users(id) on delete set null,
  trainer_user_id uuid references auth.users(id) on delete set null,
  task text not null default '',
  sop_reference text not null default '',
  you_do_it boolean not null default false,
  they_do_it boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_training_items_tenant_org_match check (tenant_id = organization_id)
);

create index if not exists management_weekly_reviews_tenant_week_idx
on public.management_weekly_reviews (tenant_id, week_start desc);

create index if not exists management_ssk_items_tenant_member_week_idx
on public.management_start_stop_keep_items (tenant_id, subject_key, week_start desc);

create index if not exists management_diamond_entries_tenant_member_week_idx
on public.management_diamond_entries (tenant_id, subject_key, week_start desc);

create index if not exists management_team_ratings_tenant_week_idx
on public.management_team_ratings (tenant_id, week_start desc);

create index if not exists meetings_tenant_type_date_idx
on public.meetings (tenant_id, meeting_type, meeting_date desc);

create index if not exists meeting_attendees_meeting_idx
on public.meeting_attendees (meeting_id);

create index if not exists meeting_agenda_items_meeting_idx
on public.meeting_agenda_items (meeting_id, item_order);

create index if not exists meeting_action_items_meeting_idx
on public.meeting_action_items (meeting_id, item_order);

create index if not exists meeting_decisions_meeting_idx
on public.meeting_decisions (meeting_id, item_order);

create index if not exists meeting_training_items_meeting_idx
on public.meeting_training_items (meeting_id, item_order);

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'management_weekly_reviews',
    'management_start_stop_keep_items',
    'management_diamond_entries',
    'management_team_ratings',
    'meetings',
    'meeting_agenda_items',
    'meeting_action_items',
    'meeting_decisions',
    'meeting_training_items'
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
    'management_weekly_reviews',
    'management_start_stop_keep_items',
    'management_diamond_entries',
    'management_team_ratings',
    'meetings',
    'meeting_attendees',
    'meeting_agenda_items',
    'meeting_action_items',
    'meeting_decisions',
    'meeting_training_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Tenant members can read rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant members can read rows" on public.%I for select to authenticated using (public.is_tenant_member(tenant_id))',
      table_name
    );
    execute format('drop policy if exists "Tenant members can create rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant members can create rows" on public.%I for insert to authenticated with check (public.is_tenant_member(tenant_id))',
      table_name
    );
    execute format('drop policy if exists "Tenant members can update rows" on public.%I', table_name);
    execute format(
      'create policy "Tenant members can update rows" on public.%I for update to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id))',
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
