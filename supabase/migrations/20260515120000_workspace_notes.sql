create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'Untitled',
  body text not null default '',
  source text not null default 'Manual',
  folder text not null default 'Funnel',
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_notes_org_updated_idx
on public.workspace_notes (organization_id, updated_at desc);

create index if not exists workspace_notes_org_folder_idx
on public.workspace_notes (organization_id, folder);

drop trigger if exists touch_workspace_notes_updated_at on public.workspace_notes;
create trigger touch_workspace_notes_updated_at
before update on public.workspace_notes
for each row execute function public.touch_updated_at();

alter table public.workspace_notes enable row level security;

drop policy if exists "Members can read workspace notes" on public.workspace_notes;
create policy "Members can read workspace notes"
on public.workspace_notes for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create workspace notes" on public.workspace_notes;
create policy "Members can create workspace notes"
on public.workspace_notes for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());

drop policy if exists "Members can update workspace notes" on public.workspace_notes;
create policy "Members can update workspace notes"
on public.workspace_notes for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

drop policy if exists "Members can delete workspace notes" on public.workspace_notes;
create policy "Members can delete workspace notes"
on public.workspace_notes for delete to authenticated
using (public.is_organization_member(organization_id));

grant all on table public.workspace_notes to service_role;
