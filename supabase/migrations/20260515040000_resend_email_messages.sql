create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  provider text not null default 'resend' check (provider = 'resend'),
  to_email text not null,
  subject text not null,
  text_body text,
  html_body text,
  external_message_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_messages_to_email_format check (to_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

alter table public.email_messages enable row level security;

drop trigger if exists touch_email_messages_updated_at on public.email_messages;
create trigger touch_email_messages_updated_at
before update on public.email_messages
for each row execute function public.touch_updated_at();

drop policy if exists "Members can read email messages" on public.email_messages;
create policy "Members can read email messages"
on public.email_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = email_messages.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Members can create email messages" on public.email_messages;
create policy "Members can create email messages"
on public.email_messages
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = email_messages.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Senders can update email messages" on public.email_messages;
create policy "Senders can update email messages"
on public.email_messages
for update
to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = email_messages.organization_id
      and membership.user_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = email_messages.organization_id
      and membership.user_id = auth.uid()
  )
);
