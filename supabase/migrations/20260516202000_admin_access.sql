alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists user_profiles_admin_idx
on public.user_profiles (user_id)
where is_admin;

revoke update on public.user_profiles from authenticated;
grant update (display_name, avatar_url, metadata, updated_at) on public.user_profiles to authenticated;
grant all on public.user_profiles to service_role;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, display_name, metadata, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    coalesce(new.raw_user_meta_data, '{}'::jsonb),
    lower(coalesce(new.email, '')) = 'matt@1000xleads.com'
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
    metadata = excluded.metadata,
    is_admin = public.user_profiles.is_admin or lower(coalesce(excluded.email, '')) = 'matt@1000xleads.com',
    updated_at = now();

  return new;
end;
$$;

insert into public.user_profiles (user_id, email, display_name, metadata, is_admin)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name'),
  coalesce(raw_user_meta_data, '{}'::jsonb),
  true
from auth.users
where lower(coalesce(email, '')) = 'matt@1000xleads.com'
on conflict (user_id) do update set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
  metadata = excluded.metadata,
  is_admin = true,
  updated_at = now();
