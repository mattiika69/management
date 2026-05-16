create table if not exists public.management_training_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.management_training_programs(id) on delete cascade,
  day_number integer not null default 1 check (day_number between 1 and 90),
  item_order integer not null default 0,
  item_type text not null default 'learning' check (item_type in ('learning', 'task', 'sop', 'meeting', 'review')),
  title text not null,
  estimated_minutes integer not null default 15 check (estimated_minutes between 0 and 1440),
  resource_url text not null default '',
  details text not null default '',
  sop_reference text not null default '',
  status text not null default 'active' check (status in ('active', 'complete', 'archived')),
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint management_training_items_tenant_org_match check (tenant_id = organization_id)
);

create index if not exists management_training_items_program_day_idx
on public.management_training_items (program_id, day_number, item_order, created_at)
where archived_at is null;

create index if not exists management_training_items_tenant_idx
on public.management_training_items (tenant_id, created_at desc)
where archived_at is null;

drop trigger if exists touch_management_training_items_updated_at on public.management_training_items;
create trigger touch_management_training_items_updated_at
before update on public.management_training_items
for each row execute function public.touch_updated_at();

alter table public.management_training_items enable row level security;

drop policy if exists "Tenant members can read rows" on public.management_training_items;
create policy "Tenant members can read rows"
on public.management_training_items
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Tenant admins can create rows" on public.management_training_items;
create policy "Tenant admins can create rows"
on public.management_training_items
for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can update rows" on public.management_training_items;
create policy "Tenant admins can update rows"
on public.management_training_items
for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists "Tenant admins can delete rows" on public.management_training_items;
create policy "Tenant admins can delete rows"
on public.management_training_items
for delete to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

grant select, insert, update, delete on public.management_training_items to authenticated;
grant all on public.management_training_items to service_role;
