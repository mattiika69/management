create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create unique index if not exists organization_invitations_open_email_idx
on public.organization_invitations (organization_id, lower(email))
where accepted_at is null and revoked_at is null;

alter table public.organization_invitations enable row level security;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
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
      and membership.role = any(allowed_roles)
  );
$$;

drop trigger if exists touch_organization_invitations_updated_at on public.organization_invitations;
create trigger touch_organization_invitations_updated_at
before update on public.organization_invitations
for each row execute function public.touch_updated_at();

drop policy if exists "Members can read memberships" on public.organization_memberships;
create policy "Members can read memberships"
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_organization_role(
    organization_memberships.organization_id,
    array['owner', 'admin']
  )
);

drop policy if exists "Admins can read organization invitations" on public.organization_invitations;
create policy "Admins can read organization invitations"
on public.organization_invitations
for select
to authenticated
using (
  public.has_organization_role(
    organization_invitations.organization_id,
    array['owner', 'admin']
  )
);

drop policy if exists "Invitees can read own pending invitations" on public.organization_invitations;
create policy "Invitees can read own pending invitations"
on public.organization_invitations
for select
to authenticated
using (
  accepted_at is null
  and revoked_at is null
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Admins can create organization invitations" on public.organization_invitations;
create policy "Admins can create organization invitations"
on public.organization_invitations
for insert
to authenticated
with check (
  invited_by = auth.uid()
  and public.has_organization_role(
    organization_invitations.organization_id,
    array['owner', 'admin']
  )
);

drop policy if exists "Admins can update organization invitations" on public.organization_invitations;
create policy "Admins can update organization invitations"
on public.organization_invitations
for update
to authenticated
using (
  public.has_organization_role(
    organization_invitations.organization_id,
    array['owner', 'admin']
  )
)
with check (
  public.has_organization_role(
    organization_invitations.organization_id,
    array['owner', 'admin']
  )
);
