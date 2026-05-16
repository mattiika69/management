create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text not null default '',
  category text not null default 'general',
  source_provider text not null default 'web'
    check (source_provider in ('web', 'slack', 'telegram')),
  source_label text not null default '',
  source_external_id text,
  source_thread_id text,
  source_channel_id text,
  source_user_id text,
  sync_status text not null default 'ready'
    check (sync_status in ('ready', 'synced', 'needs_review', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_items_tenant_org_match check (tenant_id = organization_id),
  constraint learning_items_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists learning_items_tenant_updated_idx
on public.learning_items (tenant_id, updated_at desc)
where archived_at is null;

create index if not exists learning_items_tenant_source_idx
on public.learning_items (tenant_id, source_provider, updated_at desc)
where archived_at is null;

create unique index if not exists learning_items_source_external_active_idx
on public.learning_items (tenant_id, source_provider, source_external_id)
where source_external_id is not null and archived_at is null;

drop trigger if exists touch_learning_items_updated_at on public.learning_items;
create trigger touch_learning_items_updated_at
before update on public.learning_items
for each row execute function public.touch_updated_at();

alter table public.learning_items enable row level security;

drop policy if exists "Tenant members can read learning items" on public.learning_items;
create policy "Tenant members can read learning items"
on public.learning_items for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "Tenant members can create learning items" on public.learning_items;
create policy "Tenant members can create learning items"
on public.learning_items for insert to authenticated
with check (public.is_tenant_member(tenant_id) and created_by_user_id = auth.uid());

drop policy if exists "Tenant members can update learning items" on public.learning_items;
create policy "Tenant members can update learning items"
on public.learning_items for update to authenticated
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id) and updated_by_user_id = auth.uid());

drop policy if exists "Tenant members can delete learning items" on public.learning_items;
create policy "Tenant members can delete learning items"
on public.learning_items for delete to authenticated
using (public.is_tenant_member(tenant_id));

grant select, insert, update, delete on public.learning_items to authenticated;
grant all on public.learning_items to service_role;
