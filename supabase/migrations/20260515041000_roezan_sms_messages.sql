create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  provider text not null default 'roezan' check (provider = 'roezan'),
  to_phone text not null,
  message text not null,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  media_urls text[] not null default '{}',
  external_message_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  rate_limit_limit integer,
  rate_limit_remaining integer,
  rate_limit_reset integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_messages_to_phone_format check (to_phone ~ '^\+?[0-9]{10,15}$')
);

alter table public.sms_messages enable row level security;

drop trigger if exists touch_sms_messages_updated_at on public.sms_messages;
create trigger touch_sms_messages_updated_at
before update on public.sms_messages
for each row execute function public.touch_updated_at();

drop policy if exists "Members can read sms messages" on public.sms_messages;
create policy "Members can read sms messages"
on public.sms_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = sms_messages.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Members can create sms messages" on public.sms_messages;
create policy "Members can create sms messages"
on public.sms_messages
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = sms_messages.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Senders can update sms messages" on public.sms_messages;
create policy "Senders can update sms messages"
on public.sms_messages
for update
to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = sms_messages.organization_id
      and membership.user_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = sms_messages.organization_id
      and membership.user_id = auth.uid()
  )
);
