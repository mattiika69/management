create or replace function public.sync_organization_membership_to_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.tenant_memberships
    where tenant_id = old.organization_id and user_id = old.user_id;
    return old;
  end if;

  insert into public.tenants (id, name, slug, owner_user_id, created_at, updated_at)
  select id, name, slug, owner_id, created_at, updated_at
  from public.organizations
  where id = new.organization_id
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    owner_user_id = excluded.owner_user_id,
    updated_at = now();

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    created_at,
    updated_at
  )
  values (
    new.organization_id,
    new.user_id,
    new.role,
    new.created_at,
    now()
  )
  on conflict (tenant_id, user_id) do update set
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

