create or replace function public.accept_team_invitation(invite_token_hash text)
returns table (
  ok boolean,
  tenant_id uuid,
  invitation_id uuid,
  status text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  auth_user_email text;
  confirmed_at timestamptz;
  invite_id uuid;
  invite_organization_id uuid;
  invite_email text;
  invite_role text;
  invite_accepted_at timestamptz;
  invite_revoked_at timestamptz;
  invite_expires_at timestamptz;
  profile_metadata jsonb;
begin
  if current_user_id is null then
    return query select false, null::uuid, null::uuid, 'authentication_required'::text, 'Sign in to accept this invitation.'::text;
    return;
  end if;

  select email_confirmed_at, lower(email) into confirmed_at, auth_user_email
  from auth.users
  where id = current_user_id;

  current_email := coalesce(nullif(current_email, ''), auth_user_email, '');

  if confirmed_at is null then
    return query select false, null::uuid, null::uuid, 'email_unconfirmed'::text, 'Confirm your email before accepting this invitation.'::text;
    return;
  end if;

  select
    ti.id,
    ti.tenant_id,
    ti.email,
    ti.role,
    ti.accepted_at,
    ti.revoked_at,
    ti.expires_at
  into
    invite_id,
    invite_organization_id,
    invite_email,
    invite_role,
    invite_accepted_at,
    invite_revoked_at,
    invite_expires_at
  from public.tenant_invitations ti
  where ti.token_hash = invite_token_hash
  for update;

  if invite_id is null then
    select
      oi.id,
      oi.organization_id,
      oi.email,
      oi.role,
      oi.accepted_at,
      oi.revoked_at,
      oi.expires_at
    into
      invite_id,
      invite_organization_id,
      invite_email,
      invite_role,
      invite_accepted_at,
      invite_revoked_at,
      invite_expires_at
    from public.organization_invitations oi
    where oi.token_hash = invite_token_hash
    for update;
  end if;

  if invite_id is null then
    return query select false, null::uuid, null::uuid, 'not_found'::text, 'Invitation not found.'::text;
    return;
  end if;

  if invite_accepted_at is not null or invite_revoked_at is not null then
    return query select false, invite_organization_id, invite_id, 'inactive'::text, 'This invitation is no longer active.'::text;
    return;
  end if;

  if invite_expires_at < now() then
    return query select false, invite_organization_id, invite_id, 'expired'::text, 'This invitation has expired.'::text;
    return;
  end if;

  if lower(invite_email) <> current_email then
    return query select false, invite_organization_id, invite_id, 'wrong_email'::text, format('Sign in as %s to accept this invitation.', invite_email)::text;
    return;
  end if;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (invite_organization_id, current_user_id, invite_role)
  on conflict (organization_id, user_id) do update set
    role = excluded.role;

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    archived_at,
    updated_at
  )
  values (
    invite_organization_id,
    current_user_id,
    invite_role,
    null,
    now()
  )
  on conflict (tenant_id, user_id) do update set
    role = excluded.role,
    archived_at = null,
    updated_at = now();

  update public.organization_invitations
  set accepted_at = now(), accepted_by = current_user_id
  where public.organization_invitations.organization_id = invite_organization_id
    and public.organization_invitations.token_hash = invite_token_hash
    and accepted_at is null
    and revoked_at is null;

  update public.tenant_invitations
  set accepted_at = now(), accepted_by_user_id = current_user_id
  where public.tenant_invitations.tenant_id = invite_organization_id
    and public.tenant_invitations.token_hash = invite_token_hash
    and accepted_at is null
    and revoked_at is null;

  select metadata into profile_metadata
  from public.user_profiles
  where user_id = current_user_id
  for update;

  insert into public.user_profiles (user_id, email, metadata)
  values (
    current_user_id,
    current_email,
    coalesce(profile_metadata, '{}'::jsonb) || jsonb_build_object('active_tenant_id', invite_organization_id)
  )
  on conflict (user_id) do update set
    email = coalesce(public.user_profiles.email, excluded.email),
    metadata = coalesce(public.user_profiles.metadata, '{}'::jsonb) || jsonb_build_object('active_tenant_id', invite_organization_id),
    updated_at = now();

  insert into public.admin_audit_log (
    tenant_id,
    actor_user_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    invite_organization_id,
    current_user_id,
    'team.invitation.accepted',
    'tenant_invitations',
    invite_id::text,
    jsonb_build_object('email', invite_email, 'role', invite_role)
  );

  return query select true, invite_organization_id, invite_id, 'accepted'::text, 'Invitation accepted.'::text;
end;
$$;

revoke all on function public.accept_team_invitation(text) from public;
grant execute on function public.accept_team_invitation(text) to authenticated;
