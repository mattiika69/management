insert into public.pre_made_ai_definitions (
  agent_id,
  title,
  funnel_types,
  description,
  default_prompt,
  default_criteria
) values
  (
    'book-a-call-link',
    'Book a Call Link AI',
    array['book-a-call'],
    'Creates scheduler link placement, booking instructions, and call-booking CTA guidance.',
    'Create book-a-call link instructions, CTA placement notes, and scheduler handoff copy that makes the booking action obvious.',
    '["Clear booking action","Uses scheduler link","Sets expectations","Supports qualified calls"]'::jsonb
  ),
  (
    'breakout-videos',
    'Breakout Videos AI',
    array['book-a-call'],
    'Creates labeled breakout video scripts, slide notes, and supporting VSL-style teaching assets.',
    'Create breakout video scripts with clear labels, slide guidance, VSL structure, and the next-step call-to-action.',
    '["Clearly labeled videos","VSL and slide guidance","Useful teaching structure","CTA alignment"]'::jsonb
  ),
  (
    'pre-webinar-email-flow',
    'Pre-Webinar Email Flow AI',
    array['webinar'],
    'Creates pre-webinar email reminders and value-building messages.',
    'Create a pre-webinar email sequence that increases attendance and prepares registrants for the webinar offer.',
    '["Attendance motivation","Calendar clarity","Value preview","Offer alignment"]'::jsonb
  ),
  (
    'pre-webinar-sms-flow',
    'Pre-Webinar SMS Flow AI',
    array['webinar'],
    'Creates concise SMS reminders before webinar events.',
    'Create pre-webinar SMS reminders that are short, clear, and focused on attendance.',
    '["Short messages","Clear timing","Webinar link clarity","No fluff"]'::jsonb
  ),
  (
    'webinar-platform',
    'Webinar Platform AI',
    array['webinar'],
    'Creates platform setup, access, and delivery readiness guidance.',
    'Create webinar platform setup and readiness instructions for registration, access, hosting, and attendee handoff.',
    '["Platform access clarity","Registration checks","Host readiness","Attendee support"]'::jsonb
  ),
  (
    'webinar-presentation',
    'Webinar Presentation AI',
    array['webinar'],
    'Creates webinar presentation structure and slide guidance.',
    'Create a webinar presentation structure with slide labels, teaching flow, offer transition, and CTA.',
    '["Clear slide flow","Teaching value","Offer transition","CTA alignment"]'::jsonb
  ),
  (
    'webinar-replay-page',
    'Replay Page AI',
    array['webinar'],
    'Creates replay page copy and conversion instructions.',
    'Create webinar replay page copy that frames the replay, reinforces urgency, and drives the next action.',
    '["Replay clarity","Urgency","Offer CTA","Simple next step"]'::jsonb
  ),
  (
    'webinar-meeting-scheduler',
    'Meeting Scheduler AI',
    array['webinar'],
    'Creates scheduler handoff copy after webinar attendance or replay.',
    'Create meeting scheduler handoff copy for webinar leads who are ready to book a call.',
    '["Qualification fit","Clear meeting reason","Scheduler CTA","Follow-up ready"]'::jsonb
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
  {"key":"lead_magnet","title":"Lead Magnet","agentId":"lead-magnet"},
  {"key":"page_with_vsl","title":"Sales Page","agentId":"sales-page"},
  {"key":"vsl","title":"VSL","agentId":"vsl"},
  {"key":"application_form","title":"Application Form","agentId":"application-form"},
  {"key":"unqualified_page","title":"Unqualified Page","agentId":"unqualified-page"},
  {"key":"thank_you_page","title":"Thank You Page","agentId":"thank-you-page"},
  {"key":"book_a_call","title":"Book a Call","agentId":"book-a-call-link"},
  {"key":"welcome_flow","title":"Welcome Flow","agentId":"welcome-flow"},
  {"key":"pre_call_flow","title":"Pre-Call Flow","agentId":"pre-call-flow"},
  {"key":"retargeting_ads","title":"Retargeting Ads","agentId":"retargeting-ads"},
  {"key":"appointment_setting_message","title":"Appointment-Setting Message","agentId":"appointment-setting-script"},
  {"key":"selfie_video","title":"Selfie Video","agentId":"selfie-video"},
  {"key":"breakout_videos","title":"Breakout Videos","agentId":"breakout-videos"},
  {"key":"sales_call_plan","title":"Sales Call Plan","agentId":"sales-call-plan"},
  {"key":"follow_up_flow","title":"Follow-Up Flow","agentId":"post-call-follow-up"}
]'::jsonb,
updated_at = now()
where template_key = 'book-a-call';

update public.funnel_templates
set steps = '[
  {"key":"webinar_opt_in_page","title":"Opt-In Page","agentId":"opt-in-page"},
  {"key":"webinar_confirmation_page","title":"Confirmation Page","agentId":"confirmation-page"},
  {"key":"webinar_pre_email_flow","title":"Pre-Webinar Email Flow","agentId":"pre-webinar-email-flow"},
  {"key":"webinar_pre_sms_flow","title":"Pre-Webinar SMS Flow","agentId":"pre-webinar-sms-flow"},
  {"key":"webinar_platform","title":"Webinar Platform","agentId":"webinar-platform"},
  {"key":"webinar_presentation","title":"Webinar Presentation","agentId":"webinar-presentation"},
  {"key":"webinar_replay_page","title":"Replay Page","agentId":"webinar-replay-page"},
  {"key":"webinar_post_flow","title":"Post-Webinar Flow","agentId":"post-webinar-flow"},
  {"key":"webinar_meeting_scheduler","title":"Meeting Scheduler","agentId":"webinar-meeting-scheduler"}
]'::jsonb,
updated_at = now()
where template_key = 'webinar';

update public.funnel_steps
set ai_agent_id = 'thank-you-page'
where step_key = 'thank_you_page';

update public.funnel_steps
set ai_agent_id = 'book-a-call-link'
where step_key = 'book_a_call';

update public.funnel_steps
set ai_agent_id = 'breakout-videos'
where step_key = 'breakout_videos';

update public.funnel_steps
set ai_agent_id = 'pre-webinar-email-flow'
where step_key = 'webinar_pre_email_flow';

update public.funnel_steps
set ai_agent_id = 'pre-webinar-sms-flow'
where step_key = 'webinar_pre_sms_flow';

update public.funnel_steps
set ai_agent_id = 'webinar-platform'
where step_key = 'webinar_platform';

update public.funnel_steps
set ai_agent_id = 'webinar-presentation'
where step_key = 'webinar_presentation';

update public.funnel_steps
set ai_agent_id = 'webinar-replay-page'
where step_key = 'webinar_replay_page';

update public.funnel_steps
set ai_agent_id = 'webinar-meeting-scheduler'
where step_key = 'webinar_meeting_scheduler';
