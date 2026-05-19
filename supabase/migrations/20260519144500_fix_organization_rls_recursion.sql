create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = target_organization_id
      and organization.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.archived_at is null
  )
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
  );
$$;

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
    from public.organizations organization
    where organization.id = target_organization_id
      and organization.owner_id = auth.uid()
      and ('owner' = any(allowed_roles) or 'admin' = any(allowed_roles))
  )
  or exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
      and membership.archived_at is null
  )
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_organization_role(target_organization_id, array['owner', 'admin']);
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.has_organization_role(uuid, text[]) from public;
revoke all on function public.can_manage_organization(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, text[]) to authenticated;
grant execute on function public.can_manage_organization(uuid) to authenticated;

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

drop policy if exists "Owners can update organizations" on public.organizations;
create policy "Owners can update organizations"
on public.organizations
for update
to authenticated
using (public.has_organization_role(id, array['owner', 'admin']))
with check (public.has_organization_role(id, array['owner', 'admin']));

drop policy if exists "Members can read memberships" on public.organization_memberships;
drop policy if exists "Owners can manage memberships" on public.organization_memberships;
drop policy if exists "Owners can insert memberships" on public.organization_memberships;
drop policy if exists "Owners can update memberships" on public.organization_memberships;
drop policy if exists "Owners can delete memberships" on public.organization_memberships;

create policy "Members can read memberships"
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_organization_role(organization_id, array['owner', 'admin'])
);

create policy "Owners can insert memberships"
on public.organization_memberships
for insert
to authenticated
with check (public.has_organization_role(organization_id, array['owner', 'admin']));

create policy "Owners can update memberships"
on public.organization_memberships
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin']))
with check (public.has_organization_role(organization_id, array['owner', 'admin']));

create policy "Owners can delete memberships"
on public.organization_memberships
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin']));
