alter table public.company_contexts
  drop constraint if exists company_contexts_organization_id_key;

alter table public.company_contexts
  add column if not exists title text not null default 'AI Context Doc',
  add column if not exists status text not null default 'draft',
  add column if not exists confirmed_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table public.company_contexts
  drop constraint if exists company_contexts_status_check,
  add constraint company_contexts_status_check
    check (status in ('draft', 'confirmed', 'archived'));

update public.company_contexts
set title = 'AI Context Doc'
where title = '';

alter table public.funnels
  drop constraint if exists funnels_organization_id_template_key_key;

alter table public.funnels
  add column if not exists context_id uuid references public.company_contexts(id) on delete set null,
  add column if not exists builder_key text not null default 'lovable',
  add column if not exists builder_project_url text not null default '',
  add column if not exists tech_stack jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'draft',
  add column if not exists archived_at timestamptz,
  add column if not exists duplicated_from uuid references public.funnels(id) on delete set null;

alter table public.funnels
  drop constraint if exists funnels_builder_key_check,
  add constraint funnels_builder_key_check
    check (builder_key in ('lovable', 'claude-code', 'manus', 'replit', 'bolt', 'other'));

alter table public.funnels
  drop constraint if exists funnels_status_check,
  add constraint funnels_status_check
    check (status in ('draft', 'ready', 'launching', 'launched', 'archived'));

alter table public.funnels
  drop constraint if exists funnels_tech_stack_object,
  add constraint funnels_tech_stack_object
    check (jsonb_typeof(tech_stack) = 'object');

alter table public.workspace_notes
  add column if not exists context_id uuid references public.company_contexts(id) on delete set null,
  add column if not exists funnel_id uuid references public.funnels(id) on delete set null,
  add column if not exists step_id uuid references public.funnel_steps(id) on delete set null,
  add column if not exists asset_key text,
  add column if not exists builder_key text,
  add column if not exists ai_output_id uuid references public.funnel_ai_outputs(id) on delete set null,
  add column if not exists inspiration_category text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.workspace_notes
  drop constraint if exists workspace_notes_metadata_object,
  add constraint workspace_notes_metadata_object
    check (jsonb_typeof(metadata) = 'object');

alter table public.funnel_ai_outputs
  add column if not exists context_id uuid references public.company_contexts(id) on delete set null,
  add column if not exists asset_key text,
  add column if not exists builder_key text,
  add column if not exists note_id uuid references public.workspace_notes(id) on delete set null,
  add column if not exists launch_run_id uuid,
  add column if not exists asset_run_id uuid;

create table if not exists public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  balance_credits integer not null default 0 check (balance_credits >= 0),
  lifetime_credits_purchased integer not null default 0 check (lifetime_credits_purchased >= 0),
  lifetime_credits_spent integer not null default 0 check (lifetime_credits_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.funnel_launch_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  context_id uuid references public.company_contexts(id) on delete set null,
  builder_key text not null default 'lovable',
  builder_project_url text not null default '',
  selected_assets text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  estimated_credits integer not null default 0 check (estimated_credits >= 0),
  spent_credits integer not null default 0 check (spent_credits >= 0),
  error_message text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnel_asset_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  launch_run_id uuid not null references public.funnel_launch_runs(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  context_id uuid references public.company_contexts(id) on delete set null,
  step_id uuid references public.funnel_steps(id) on delete set null,
  asset_key text not null,
  agent_id text references public.pre_made_ai_definitions(agent_id),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  credit_cost integer not null default 50 check (credit_cost >= 0),
  ai_output_id uuid references public.funnel_ai_outputs(id) on delete set null,
  note_id uuid references public.workspace_notes(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  credit_account_id uuid not null references public.credit_accounts(id) on delete cascade,
  amount_credits integer not null check (amount_credits <> 0),
  balance_after_credits integer not null check (balance_after_credits >= 0),
  reason text not null check (reason in ('purchase', 'asset_generation', 'refund', 'admin_adjustment')),
  funnel_id uuid references public.funnels(id) on delete set null,
  launch_run_id uuid references public.funnel_launch_runs(id) on delete set null,
  asset_run_id uuid references public.funnel_asset_runs(id) on delete set null,
  stripe_event_id text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, external_id),
  constraint credit_ledger_entries_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.developer_ai_training (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.pre_made_ai_definitions(agent_id),
  asset_key text not null default '',
  builder_key text not null default 'all',
  instructions text not null default '',
  criteria jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, asset_key, builder_key),
  constraint developer_ai_training_criteria_array check (jsonb_typeof(criteria) = 'array')
);

alter table public.funnel_ai_outputs
  drop constraint if exists funnel_ai_outputs_launch_run_id_fkey,
  add constraint funnel_ai_outputs_launch_run_id_fkey
    foreign key (launch_run_id) references public.funnel_launch_runs(id) on delete set null;

alter table public.funnel_ai_outputs
  drop constraint if exists funnel_ai_outputs_asset_run_id_fkey,
  add constraint funnel_ai_outputs_asset_run_id_fkey
    foreign key (asset_run_id) references public.funnel_asset_runs(id) on delete set null;

create index if not exists company_contexts_org_active_idx
  on public.company_contexts (organization_id, updated_at desc)
  where archived_at is null;

create index if not exists funnels_org_template_active_idx
  on public.funnels (organization_id, template_key, updated_at desc)
  where archived_at is null;

create index if not exists funnels_org_context_idx
  on public.funnels (organization_id, context_id)
  where archived_at is null;

create index if not exists workspace_notes_org_context_idx
  on public.workspace_notes (organization_id, context_id, updated_at desc);

create index if not exists workspace_notes_org_funnel_idx
  on public.workspace_notes (organization_id, funnel_id, updated_at desc);

create index if not exists workspace_notes_org_asset_idx
  on public.workspace_notes (organization_id, asset_key, updated_at desc);

create index if not exists funnel_launch_runs_org_funnel_idx
  on public.funnel_launch_runs (organization_id, funnel_id, created_at desc);

create index if not exists funnel_asset_runs_org_launch_idx
  on public.funnel_asset_runs (organization_id, launch_run_id, created_at);

create index if not exists credit_ledger_entries_org_created_idx
  on public.credit_ledger_entries (organization_id, created_at desc);

drop trigger if exists touch_credit_accounts_updated_at on public.credit_accounts;
create trigger touch_credit_accounts_updated_at
before update on public.credit_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnel_launch_runs_updated_at on public.funnel_launch_runs;
create trigger touch_funnel_launch_runs_updated_at
before update on public.funnel_launch_runs
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnel_asset_runs_updated_at on public.funnel_asset_runs;
create trigger touch_funnel_asset_runs_updated_at
before update on public.funnel_asset_runs
for each row execute function public.touch_updated_at();

drop trigger if exists touch_developer_ai_training_updated_at on public.developer_ai_training;
create trigger touch_developer_ai_training_updated_at
before update on public.developer_ai_training
for each row execute function public.touch_updated_at();

alter table public.credit_accounts enable row level security;
alter table public.funnel_launch_runs enable row level security;
alter table public.funnel_asset_runs enable row level security;
alter table public.credit_ledger_entries enable row level security;
alter table public.developer_ai_training enable row level security;

drop policy if exists "Members can read credit accounts" on public.credit_accounts;
create policy "Members can read credit accounts"
on public.credit_accounts for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can read launch runs" on public.funnel_launch_runs;
create policy "Members can read launch runs"
on public.funnel_launch_runs for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can read asset runs" on public.funnel_asset_runs;
create policy "Members can read asset runs"
on public.funnel_asset_runs for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can read credit ledger" on public.credit_ledger_entries;
create policy "Members can read credit ledger"
on public.credit_ledger_entries for select to authenticated
using (public.is_organization_member(organization_id));

grant all on table public.credit_accounts to service_role;
grant all on table public.funnel_launch_runs to service_role;
grant all on table public.funnel_asset_runs to service_role;
grant all on table public.credit_ledger_entries to service_role;
grant all on table public.developer_ai_training to service_role;

create or replace function public.spend_credits(
  target_organization_id uuid,
  amount_to_spend integer,
  target_funnel_id uuid default null,
  target_launch_run_id uuid default null,
  target_asset_run_id uuid default null,
  entry_external_id text default null,
  entry_metadata jsonb default '{}'::jsonb,
  actor_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.credit_accounts%rowtype;
  next_balance integer;
begin
  if amount_to_spend <= 0 then
    raise exception 'amount_to_spend must be positive';
  end if;

  insert into public.credit_accounts (organization_id)
  values (target_organization_id)
  on conflict (organization_id) do nothing;

  select *
  into account_row
  from public.credit_accounts
  where organization_id = target_organization_id
  for update;

  if account_row.balance_credits < amount_to_spend then
    raise exception 'insufficient_credits';
  end if;

  next_balance := account_row.balance_credits - amount_to_spend;

  update public.credit_accounts
  set
    balance_credits = next_balance,
    lifetime_credits_spent = lifetime_credits_spent + amount_to_spend
  where id = account_row.id;

  insert into public.credit_ledger_entries (
    organization_id,
    credit_account_id,
    amount_credits,
    balance_after_credits,
    reason,
    funnel_id,
    launch_run_id,
    asset_run_id,
    external_id,
    metadata,
    created_by
  ) values (
    target_organization_id,
    account_row.id,
    amount_to_spend * -1,
    next_balance,
    'asset_generation',
    target_funnel_id,
    target_launch_run_id,
    target_asset_run_id,
    entry_external_id,
    coalesce(entry_metadata, '{}'::jsonb),
    actor_user_id
  );

  return next_balance;
end;
$$;

create or replace function public.grant_credits(
  target_organization_id uuid,
  amount_to_grant integer,
  stripe_event text default null,
  entry_external_id text default null,
  entry_metadata jsonb default '{}'::jsonb,
  actor_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.credit_accounts%rowtype;
  next_balance integer;
begin
  if amount_to_grant <= 0 then
    raise exception 'amount_to_grant must be positive';
  end if;

  insert into public.credit_accounts (organization_id)
  values (target_organization_id)
  on conflict (organization_id) do nothing;

  select *
  into account_row
  from public.credit_accounts
  where organization_id = target_organization_id
  for update;

  next_balance := account_row.balance_credits + amount_to_grant;

  update public.credit_accounts
  set
    balance_credits = next_balance,
    lifetime_credits_purchased = lifetime_credits_purchased + amount_to_grant
  where id = account_row.id;

  insert into public.credit_ledger_entries (
    organization_id,
    credit_account_id,
    amount_credits,
    balance_after_credits,
    reason,
    stripe_event_id,
    external_id,
    metadata,
    created_by
  ) values (
    target_organization_id,
    account_row.id,
    amount_to_grant,
    next_balance,
    'purchase',
    stripe_event,
    entry_external_id,
    coalesce(entry_metadata, '{}'::jsonb),
    actor_user_id
  )
  on conflict (organization_id, external_id) do nothing;

  return next_balance;
end;
$$;

grant execute on function public.spend_credits(uuid, integer, uuid, uuid, uuid, text, jsonb, uuid) to service_role;
grant execute on function public.grant_credits(uuid, integer, text, text, jsonb, uuid) to service_role;

insert into public.pre_made_ai_definitions (
  agent_id,
  title,
  funnel_types,
  description,
  default_prompt,
  default_criteria
) values (
  'application-questions',
  'Application Questions AI',
  array['book-a-call'],
  'Creates qualification and application questions for the booked-call path.',
  'Create concise application questions that qualify fit, surface urgency, and prepare the sales call.',
  '["Clear qualification signal","Short and easy to answer","Surfaces urgency and fit","Prepares sales team"]'::jsonb
)
on conflict (agent_id) do update set
  title = excluded.title,
  funnel_types = excluded.funnel_types,
  description = excluded.description,
  default_prompt = excluded.default_prompt,
  default_criteria = excluded.default_criteria,
  updated_at = now();

update public.funnel_templates
set steps = '[
  {"key":"opt_in_page","title":"Opt-In Page","agentId":"opt-in-page"},
  {"key":"page_with_vsl","title":"Sales Page","agentId":"sales-page"},
  {"key":"vsl","title":"VSL","agentId":"vsl"},
  {"key":"application_questions","title":"Application Questions","agentId":"application-questions"},
  {"key":"thank_you_page","title":"Thank You Page","agentId":"confirmation-page"},
  {"key":"pre_call_flow","title":"Pre-Call Flow","agentId":"pre-call-flow"},
  {"key":"retargeting_ads","title":"Retargeting Ads","agentId":"retargeting-ads"},
  {"key":"appointment_setting_message","title":"Appointment-Setting Message","agentId":"appointment-setting-script"},
  {"key":"selfie_video","title":"Selfie Video","agentId":"selfie-video"},
  {"key":"breakout_videos","title":"Breakout Videos","agentId":"youtube-intro"},
  {"key":"follow_up_flow","title":"Follow-Up Flow","agentId":"post-call-follow-up"}
]'::jsonb,
updated_at = now()
where template_key = 'book-a-call';
