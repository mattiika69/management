create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.leads
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

create table if not exists public.billing_customers (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.leads enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_organizations_updated_at on public.organizations;
create trigger touch_organizations_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_billing_customers_updated_at on public.billing_customers;
create trigger touch_billing_customers_updated_at
before update on public.billing_customers
for each row execute function public.touch_updated_at();

drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

create or replace function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_memberships (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists add_owner_membership_on_organization on public.organizations;
create trigger add_owner_membership_on_organization
after insert on public.organizations
for each row execute function public.add_owner_membership();

drop policy if exists "Anyone can submit leads" on public.leads;
drop policy if exists "Authenticated users can read leads" on public.leads;

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations"
on public.organizations
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = organizations.id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Users can create owned organizations" on public.organizations;
create policy "Users can create owned organizations"
on public.organizations
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update organizations" on public.organizations;
create policy "Owners can update organizations"
on public.organizations
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Members can read memberships" on public.organization_memberships;
create policy "Members can read memberships"
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organizations organization
    where organization.id = organization_memberships.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "Owners can manage memberships" on public.organization_memberships;
create policy "Owners can manage memberships"
on public.organization_memberships
for all
to authenticated
using (
  exists (
    select 1
    from public.organizations organization
    where organization.id = organization_memberships.organization_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organizations organization
    where organization.id = organization_memberships.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "Members can read leads" on public.leads;
create policy "Members can read leads"
on public.leads
for select
to authenticated
using (
  organization_id is not null
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = leads.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Members can create leads" on public.leads;
create policy "Members can create leads"
on public.leads
for insert
to authenticated
with check (
  organization_id is not null
  and created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = leads.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Members can update leads" on public.leads;
create policy "Members can update leads"
on public.leads
for update
to authenticated
using (
  organization_id is not null
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = leads.organization_id
      and membership.user_id = auth.uid()
  )
)
with check (
  organization_id is not null
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = leads.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Members can read billing customers" on public.billing_customers;
create policy "Members can read billing customers"
on public.billing_customers
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = billing_customers.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Owners can manage billing customers" on public.billing_customers;
create policy "Owners can manage billing customers"
on public.billing_customers
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = billing_customers.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = billing_customers.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

drop policy if exists "Members can read subscriptions" on public.subscriptions;
create policy "Members can read subscriptions"
on public.subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = subscriptions.organization_id
      and membership.user_id = auth.uid()
  )
);
