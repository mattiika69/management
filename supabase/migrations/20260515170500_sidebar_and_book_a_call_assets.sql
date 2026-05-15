create table if not exists public.user_sidebar_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_order text[] not null default '{}',
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists user_sidebar_preferences_org_user_idx
on public.user_sidebar_preferences (organization_id, user_id);

drop trigger if exists touch_user_sidebar_preferences_updated_at on public.user_sidebar_preferences;
create trigger touch_user_sidebar_preferences_updated_at
before update on public.user_sidebar_preferences
for each row execute function public.touch_updated_at();

alter table public.user_sidebar_preferences enable row level security;

drop policy if exists "Users can read own sidebar preferences" on public.user_sidebar_preferences;
create policy "Users can read own sidebar preferences"
on public.user_sidebar_preferences for select to authenticated
using (user_id = auth.uid() and public.is_organization_member(organization_id));

drop policy if exists "Users can create own sidebar preferences" on public.user_sidebar_preferences;
create policy "Users can create own sidebar preferences"
on public.user_sidebar_preferences for insert to authenticated
with check (user_id = auth.uid() and public.is_organization_member(organization_id));

drop policy if exists "Users can update own sidebar preferences" on public.user_sidebar_preferences;
create policy "Users can update own sidebar preferences"
on public.user_sidebar_preferences for update to authenticated
using (user_id = auth.uid() and public.is_organization_member(organization_id))
with check (
  user_id = auth.uid()
  and updated_by = auth.uid()
  and public.is_organization_member(organization_id)
);

drop policy if exists "Users can delete own sidebar preferences" on public.user_sidebar_preferences;
create policy "Users can delete own sidebar preferences"
on public.user_sidebar_preferences for delete to authenticated
using (user_id = auth.uid() and public.is_organization_member(organization_id));

grant all on table public.user_sidebar_preferences to service_role;

insert into public.pre_made_ai_definitions (
  agent_id,
  title,
  funnel_types,
  description,
  default_prompt,
  default_criteria
) values
  (
    'lead-magnet',
    'Lead Magnet AI',
    array['book-a-call'],
    'Creates simple lead magnet concepts and delivery copy for the opt-in path.',
    'Create a lead magnet concept, outline, landing copy, and delivery notes that match the ICP and offer.',
    '["Simple promise","Useful in minutes","Matches ICP pain","Supports the booked-call path"]'::jsonb
  ),
  (
    'application-form',
    'Application Form AI',
    array['book-a-call'],
    'Creates qualification form structure and application page copy.',
    'Create an application form that qualifies fit, surfaces urgency, and prepares the sales call.',
    '["Clear qualification signal","Short and easy to complete","Surfaces urgency and fit","Prepares sales team"]'::jsonb
  ),
  (
    'unqualified-page',
    'Unqualified Page AI',
    array['book-a-call'],
    'Creates fallback pages for people who should not book a call yet.',
    'Create an unqualified page that respectfully redirects non-fit leads toward the best next step.',
    '["Respectful tone","Clear reason","Downsell or nurture path","No dead end"]'::jsonb
  ),
  (
    'sales-call-plan',
    'Sales Call Plan AI',
    array['book-a-call'],
    'Creates sales call plans, discovery structure, objection handling, and close logic.',
    'Create a sales call plan with opener, discovery questions, pitch structure, objection handling, close, and follow-up handoff.',
    '["Clear call structure","ICP-specific discovery","Objection handling","Close and follow-up handoff"]'::jsonb
  )
on conflict (agent_id) do update set
  title = excluded.title,
  funnel_types = excluded.funnel_types,
  description = excluded.description,
  default_prompt = excluded.default_prompt,
  default_criteria = excluded.default_criteria,
  updated_at = now();

update public.pre_made_ai_definitions
set
  agent_id = 'application-form',
  title = 'Application Form AI',
  description = 'Creates qualification form structure and application page copy.',
  default_prompt = 'Create an application form that qualifies fit, surfaces urgency, and prepares the sales call.',
  default_criteria = '["Clear qualification signal","Short and easy to complete","Surfaces urgency and fit","Prepares sales team"]'::jsonb,
  updated_at = now()
where agent_id = 'application-questions'
  and not exists (
    select 1
    from public.pre_made_ai_definitions existing
    where existing.agent_id = 'application-form'
  );

update public.funnel_steps step
set
  step_key = 'application_form',
  title = 'Application Form',
  ai_agent_id = 'application-form'
where step.step_key = 'application_questions'
  and not exists (
    select 1
    from public.funnel_steps existing
    where existing.funnel_id = step.funnel_id
      and existing.step_key = 'application_form'
  );

update public.funnel_steps
set
  title = 'Application Form',
  ai_agent_id = 'application-form'
where step_key = 'application_form';

update public.funnel_templates
set steps = '[
  {"key":"opt_in_page","title":"Opt-In Page","agentId":"opt-in-page"},
  {"key":"lead_magnet","title":"Lead Magnet","agentId":"lead-magnet"},
  {"key":"page_with_vsl","title":"Sales Page","agentId":"sales-page"},
  {"key":"vsl","title":"VSL","agentId":"vsl"},
  {"key":"application_form","title":"Application Form","agentId":"application-form"},
  {"key":"unqualified_page","title":"Unqualified Page","agentId":"unqualified-page"},
  {"key":"thank_you_page","title":"Thank You Page","agentId":"confirmation-page"},
  {"key":"book_a_call","title":"Book a Call","agentId":null},
  {"key":"welcome_flow","title":"Welcome Flow","agentId":"welcome-flow"},
  {"key":"pre_call_flow","title":"Pre-Call Flow","agentId":"pre-call-flow"},
  {"key":"retargeting_ads","title":"Retargeting Ads","agentId":"retargeting-ads"},
  {"key":"appointment_setting_message","title":"Appointment-Setting Message","agentId":"appointment-setting-script"},
  {"key":"selfie_video","title":"Selfie Video","agentId":"selfie-video"},
  {"key":"breakout_videos","title":"Breakout Videos","agentId":"youtube-intro"},
  {"key":"sales_call_plan","title":"Sales Call Plan","agentId":"sales-call-plan"},
  {"key":"follow_up_flow","title":"Follow-Up Flow","agentId":"post-call-follow-up"}
]'::jsonb,
updated_at = now()
where template_key = 'book-a-call';
