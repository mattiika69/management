create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  );
$$;

create table if not exists public.company_contexts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  constraint company_contexts_data_object check (jsonb_typeof(data) = 'object')
);

create table if not exists public.company_context_versions (
  id uuid primary key default gen_random_uuid(),
  company_context_id uuid not null references public.company_contexts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data jsonb not null,
  saved_by uuid references auth.users(id) on delete set null,
  saved_at timestamptz not null default now()
);

create table if not exists public.funnel_templates (
  template_key text primary key,
  name text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funnel_templates_steps_array check (jsonb_typeof(steps) = 'array')
);

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_key text not null references public.funnel_templates(template_key),
  name text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_key)
);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_key text not null,
  step_order integer not null default 0,
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  url text not null default '',
  notes text not null default '',
  assigned_to text not null default '',
  ai_agent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (funnel_id, step_key),
  constraint funnel_steps_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.pre_made_ai_definitions (
  agent_id text primary key,
  title text not null,
  funnel_types text[] not null default '{}',
  description text not null default '',
  default_prompt text not null default '',
  default_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pre_made_ai_definitions_criteria_array check (jsonb_typeof(default_criteria) = 'array')
);

create table if not exists public.workspace_ai_training (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.pre_made_ai_definitions(agent_id),
  overall_description text not null default '',
  framework text not null default '',
  criteria text not null default '',
  ai_sequence text not null default '',
  training_refs jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_id),
  constraint workspace_ai_training_refs_array check (jsonb_typeof(training_refs) = 'array')
);

create table if not exists public.funnel_learning_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_type text not null check (funnel_type in ('book-a-call', 'webinar')),
  section text not null check (section in ('learning', 'training')),
  item_type text not null default 'training' check (item_type in ('learning', 'training', 'assignment')),
  item_order integer not null default 0,
  title text not null,
  body text not null default '',
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnel_ai_outputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  step_id uuid references public.funnel_steps(id) on delete set null,
  agent_id text not null references public.pre_made_ai_definitions(agent_id),
  prompt text not null default '',
  output_text text not null default '',
  status text not null default 'saved' check (status in ('saved', 'generated', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funnel_ai_outputs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

alter table public.integration_connections
  add column if not exists external_user_id text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'active' check (status in ('active', 'revoked')),
  add column if not exists revoked_at timestamptz;

alter table public.integration_messages
  add column if not exists command text,
  add column if not exists status text not null default 'saved' check (status in ('saved', 'sent', 'failed', 'ignored')),
  add column if not exists error_message text;

create table if not exists public.integration_processed_events (
  provider text not null check (provider in ('slack', 'telegram')),
  external_event_id text not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  processed_at timestamptz not null default now(),
  primary key (provider, external_event_id)
);

create table if not exists public.integration_secrets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('slack', 'telegram')),
  secret_name text not null,
  secret_value text not null,
  secret_hint text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, secret_name)
);

create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists company_context_versions_org_saved_idx
  on public.company_context_versions (organization_id, saved_at desc);
create index if not exists funnels_org_idx on public.funnels (organization_id);
create index if not exists funnel_steps_org_funnel_idx on public.funnel_steps (organization_id, funnel_id, step_order);
create index if not exists workspace_ai_training_org_idx on public.workspace_ai_training (organization_id);
create index if not exists funnel_learning_items_org_funnel_idx on public.funnel_learning_items (organization_id, funnel_type, item_order);
create index if not exists funnel_ai_outputs_org_created_idx on public.funnel_ai_outputs (organization_id, created_at desc);
create index if not exists integration_connections_org_provider_idx on public.integration_connections (organization_id, provider) where revoked_at is null;
create index if not exists integration_connections_provider_team_idx on public.integration_connections (provider, external_team_id) where revoked_at is null;
create index if not exists integration_connections_provider_channel_idx on public.integration_connections (provider, external_channel_id) where revoked_at is null;
create index if not exists integration_messages_org_created_idx on public.integration_messages (organization_id, created_at desc);
create index if not exists integration_processed_events_processed_idx on public.integration_processed_events (processed_at desc);
create index if not exists telegram_link_codes_code_active_idx on public.telegram_link_codes (code) where used_at is null;
create index if not exists telegram_link_codes_user_idx on public.telegram_link_codes (user_id, created_at desc);

drop trigger if exists touch_company_contexts_updated_at on public.company_contexts;
create trigger touch_company_contexts_updated_at
before update on public.company_contexts
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnel_templates_updated_at on public.funnel_templates;
create trigger touch_funnel_templates_updated_at
before update on public.funnel_templates
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnels_updated_at on public.funnels;
create trigger touch_funnels_updated_at
before update on public.funnels
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnel_steps_updated_at on public.funnel_steps;
create trigger touch_funnel_steps_updated_at
before update on public.funnel_steps
for each row execute function public.touch_updated_at();

drop trigger if exists touch_pre_made_ai_definitions_updated_at on public.pre_made_ai_definitions;
create trigger touch_pre_made_ai_definitions_updated_at
before update on public.pre_made_ai_definitions
for each row execute function public.touch_updated_at();

drop trigger if exists touch_workspace_ai_training_updated_at on public.workspace_ai_training;
create trigger touch_workspace_ai_training_updated_at
before update on public.workspace_ai_training
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnel_learning_items_updated_at on public.funnel_learning_items;
create trigger touch_funnel_learning_items_updated_at
before update on public.funnel_learning_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_funnel_ai_outputs_updated_at on public.funnel_ai_outputs;
create trigger touch_funnel_ai_outputs_updated_at
before update on public.funnel_ai_outputs
for each row execute function public.touch_updated_at();

drop trigger if exists touch_integration_secrets_updated_at on public.integration_secrets;
create trigger touch_integration_secrets_updated_at
before update on public.integration_secrets
for each row execute function public.touch_updated_at();

create or replace function public.snapshot_company_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.data is distinct from new.data then
    insert into public.company_context_versions (
      company_context_id,
      organization_id,
      data,
      saved_by
    ) values (
      old.id,
      old.organization_id,
      old.data,
      new.updated_by
    );
  end if;
  return new;
end;
$$;

drop trigger if exists snapshot_company_context_on_update on public.company_contexts;
create trigger snapshot_company_context_on_update
after update on public.company_contexts
for each row execute function public.snapshot_company_context();

alter table public.company_contexts enable row level security;
alter table public.company_context_versions enable row level security;
alter table public.funnel_templates enable row level security;
alter table public.funnels enable row level security;
alter table public.funnel_steps enable row level security;
alter table public.pre_made_ai_definitions enable row level security;
alter table public.workspace_ai_training enable row level security;
alter table public.funnel_learning_items enable row level security;
alter table public.funnel_ai_outputs enable row level security;
alter table public.integration_processed_events enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.telegram_link_codes enable row level security;

drop policy if exists "Members can read company contexts" on public.company_contexts;
create policy "Members can read company contexts"
on public.company_contexts for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create company contexts" on public.company_contexts;
create policy "Members can create company contexts"
on public.company_contexts for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());

drop policy if exists "Members can update company contexts" on public.company_contexts;
create policy "Members can update company contexts"
on public.company_contexts for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can read company context versions" on public.company_context_versions;
create policy "Members can read company context versions"
on public.company_context_versions for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Authenticated users can read funnel templates" on public.funnel_templates;
create policy "Authenticated users can read funnel templates"
on public.funnel_templates for select to authenticated
using (true);

drop policy if exists "Members can read funnels" on public.funnels;
create policy "Members can read funnels"
on public.funnels for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create funnels" on public.funnels;
create policy "Members can create funnels"
on public.funnels for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());

drop policy if exists "Members can update funnels" on public.funnels;
create policy "Members can update funnels"
on public.funnels for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can read funnel steps" on public.funnel_steps;
create policy "Members can read funnel steps"
on public.funnel_steps for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create funnel steps" on public.funnel_steps;
create policy "Members can create funnel steps"
on public.funnel_steps for insert to authenticated
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can update funnel steps" on public.funnel_steps;
create policy "Members can update funnel steps"
on public.funnel_steps for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Authenticated users can read pre made ai definitions" on public.pre_made_ai_definitions;
create policy "Authenticated users can read pre made ai definitions"
on public.pre_made_ai_definitions for select to authenticated
using (true);

drop policy if exists "Members can read ai training" on public.workspace_ai_training;
create policy "Members can read ai training"
on public.workspace_ai_training for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create ai training" on public.workspace_ai_training;
create policy "Members can create ai training"
on public.workspace_ai_training for insert to authenticated
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can update ai training" on public.workspace_ai_training;
create policy "Members can update ai training"
on public.workspace_ai_training for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can read funnel learning items" on public.funnel_learning_items;
create policy "Members can read funnel learning items"
on public.funnel_learning_items for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create funnel learning items" on public.funnel_learning_items;
create policy "Members can create funnel learning items"
on public.funnel_learning_items for insert to authenticated
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can update funnel learning items" on public.funnel_learning_items;
create policy "Members can update funnel learning items"
on public.funnel_learning_items for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can read funnel ai outputs" on public.funnel_ai_outputs;
create policy "Members can read funnel ai outputs"
on public.funnel_ai_outputs for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create funnel ai outputs" on public.funnel_ai_outputs;
create policy "Members can create funnel ai outputs"
on public.funnel_ai_outputs for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());

drop policy if exists "Members can update own funnel ai outputs" on public.funnel_ai_outputs;
create policy "Members can update own funnel ai outputs"
on public.funnel_ai_outputs for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Admins can read telegram link codes" on public.telegram_link_codes;
create policy "Admins can read telegram link codes"
on public.telegram_link_codes for select to authenticated
using (user_id = auth.uid() or public.can_manage_organization(organization_id));

drop policy if exists "Members can create telegram link codes" on public.telegram_link_codes;
create policy "Members can create telegram link codes"
on public.telegram_link_codes for insert to authenticated
with check (user_id = auth.uid() and public.is_organization_member(organization_id));

grant all on table public.company_contexts to service_role;
grant all on table public.company_context_versions to service_role;
grant all on table public.funnel_templates to service_role;
grant all on table public.funnels to service_role;
grant all on table public.funnel_steps to service_role;
grant all on table public.pre_made_ai_definitions to service_role;
grant all on table public.workspace_ai_training to service_role;
grant all on table public.funnel_learning_items to service_role;
grant all on table public.funnel_ai_outputs to service_role;
grant all on table public.integration_processed_events to service_role;
grant all on table public.integration_secrets to service_role;
grant all on table public.telegram_link_codes to service_role;

grant select on table public.funnel_templates to authenticated;
grant select on table public.pre_made_ai_definitions to authenticated;

insert into public.funnel_templates (template_key, name, description, steps)
values
  (
    'book-a-call',
    'Book-a-Call Funnel',
    'A focused funnel path from opt-in through booked call, sales call planning, and follow-up.',
    '[
      {"key":"opt_in_page","title":"Opt-In Page","agentId":"opt-in-page"},
      {"key":"page_with_vsl","title":"Page With VSL","agentId":"sales-page"},
      {"key":"vsl","title":"VSL","agentId":"vsl"},
      {"key":"thank_you_page","title":"Thank You / Confirmation Page","agentId":"confirmation-page"},
      {"key":"welcome_flow","title":"Welcome Flow","agentId":"welcome-flow"},
      {"key":"pre_call_flow","title":"Pre-Call Flow","agentId":"pre-call-flow"},
      {"key":"selfie_video","title":"Selfie Video","agentId":"selfie-video"},
      {"key":"retargeting_ads","title":"Retargeting Ads","agentId":"retargeting-ads"},
      {"key":"breakout_videos","title":"Breakout / YouTube Intro Videos","agentId":"youtube-intro"},
      {"key":"sales_call_plan","title":"Sales Call Plan","agentId":"appointment-setting-script"},
      {"key":"follow_up_flow","title":"Post-Call Follow-Up","agentId":"post-call-follow-up"}
    ]'::jsonb
  ),
  (
    'webinar',
    'Webinar Funnel',
    'A webinar funnel path from registration through attendance, replay, post-webinar conversion, and scheduling.',
    '[
      {"key":"webinar_opt_in_page","title":"Opt-In Page","agentId":"opt-in-page"},
      {"key":"webinar_confirmation_page","title":"Confirmation Page","agentId":"confirmation-page"},
      {"key":"webinar_pre_email_flow","title":"Pre-Webinar Email Flow","agentId":"pre-webinar-flow"},
      {"key":"webinar_pre_sms_flow","title":"Pre-Webinar SMS Flow","agentId":"pre-webinar-flow"},
      {"key":"webinar_platform","title":"Webinar Platform","agentId":null},
      {"key":"webinar_presentation","title":"Webinar Presentation","agentId":null},
      {"key":"webinar_replay_page","title":"Replay Page","agentId":null},
      {"key":"webinar_post_flow","title":"Post-Webinar Flow","agentId":"post-webinar-flow"},
      {"key":"webinar_meeting_scheduler","title":"Meeting Scheduler","agentId":"appointment-setting-script"}
    ]'::jsonb
  )
on conflict (template_key) do update set
  name = excluded.name,
  description = excluded.description,
  steps = excluded.steps,
  updated_at = now();

insert into public.pre_made_ai_definitions (
  agent_id,
  title,
  funnel_types,
  description,
  default_prompt,
  default_criteria
)
values
  ('sales-page', 'Sales Page AI', array['book-a-call'], 'Creates and improves the core sales page for the booked-call path.', 'Use the AI Company Document, the selected funnel step, and training criteria to create sales page copy that drives qualified booked calls.', '["Clear offer promise","Uses ICP language","Includes proof and objections","Drives the next booked-call action"]'::jsonb),
  ('vsl', 'VSL AI', array['book-a-call'], 'Creates video sales letter outlines and scripts.', 'Create a VSL script or outline grounded in the offer, ICP, proof, objections, and funnel destination.', '["Strong hook","Clear problem and mechanism","Proof-driven","Clear call to action"]'::jsonb),
  ('opt-in-page', 'Opt-In Page AI', array['book-a-call','webinar'], 'Creates opt-in page copy for booked-call and webinar funnels.', 'Create opt-in page copy using company context, funnel goal, promise, proof, and the next step.', '["Specific promise","Low-friction CTA","Matches funnel type","Uses company context"]'::jsonb),
  ('confirmation-page', 'Confirmation Page AI', array['book-a-call','webinar'], 'Creates confirmation and thank-you page copy.', 'Create confirmation page copy that confirms the action and drives the next required step.', '["Confirms conversion","Sets expectations","Includes next step","Uses relevant links"]'::jsonb),
  ('thank-you-page', 'Thank You Page AI', array['book-a-call'], 'Creates thank-you page copy and next-step instructions.', 'Create thank-you page copy that makes the next action clear and keeps the user moving.', '["Clear next action","Warm confirmation","Includes required links","Maintains offer context"]'::jsonb),
  ('welcome-flow', 'Welcome Flow AI', array['book-a-call'], 'Creates welcome email or message flow for new leads.', 'Create a welcome flow that introduces the company and moves the prospect toward the booked-call goal.', '["Personal opening","Company context","Clear CTA","Sequence logic"]'::jsonb),
  ('pre-call-flow', 'Pre-Call Flow AI', array['book-a-call'], 'Creates pre-call nurture and reminder flow.', 'Create a pre-call flow that increases show-up rate and pre-sells the offer before the call.', '["Show-up reinforcement","Sales presentation link where relevant","Objection handling","Clear timing"]'::jsonb),
  ('post-call-follow-up', 'Post-Call Follow-Up AI', array['book-a-call'], 'Creates post-call follow-up assets.', 'Create follow-up copy that moves a sales conversation forward after the call.', '["References call context","Handles objections","Clear reply CTA","Persists next step"]'::jsonb),
  ('retargeting-ads', 'Retargeting Ads AI', array['book-a-call'], 'Creates retargeting ad angles and copy for funnel visitors.', 'Create retargeting ad copy grounded in objections, proof, and funnel status.', '["Specific audience","Proof or objection angle","CTA back to funnel","No broad generic claims"]'::jsonb),
  ('appointment-setting-script', 'Appointment Setting Script AI', array['book-a-call','webinar'], 'Creates appointment-setting and meeting-scheduler scripts.', 'Create appointment-setting scripts, call-plan prompts, and scheduler handoff copy using company context.', '["Qualifies prospect","Clear meeting reason","Handles objections","Moves to scheduled call"]'::jsonb),
  ('selfie-video', 'Selfie Video AI', array['book-a-call'], 'Creates short selfie video scripts for pre-call trust.', 'Create a concise selfie video script that builds trust and reinforces the booked-call path.', '["Human tone","Short and clear","Relevant proof","Next step reminder"]'::jsonb),
  ('youtube-intro', 'YouTube Intro AI', array['book-a-call'], 'Creates short intro/breakout video scripts.', 'Create YouTube or breakout intro scripts that support the book-a-call funnel.', '["Strong opener","Contextual teaching point","CTA alignment","Simple structure"]'::jsonb),
  ('pre-webinar-flow', 'Pre-Webinar Flow AI', array['webinar'], 'Creates pre-webinar email/SMS nurture and attendance flow.', 'Create a pre-webinar sequence that increases attendance and prepares registrants for the offer.', '["Registration reminder","Attendance motivation","Value preview","Calendar/platform clarity"]'::jsonb),
  ('post-webinar-flow', 'Post-Webinar Flow AI', array['webinar'], 'Creates post-webinar follow-up and conversion flow.', 'Create a post-webinar flow that uses replay, offer context, and scheduler handoff to drive conversion.', '["Replay CTA","Offer urgency","Objection handling","Scheduler handoff"]'::jsonb)
on conflict (agent_id) do update set
  title = excluded.title,
  funnel_types = excluded.funnel_types,
  description = excluded.description,
  default_prompt = excluded.default_prompt,
  default_criteria = excluded.default_criteria,
  updated_at = now();
