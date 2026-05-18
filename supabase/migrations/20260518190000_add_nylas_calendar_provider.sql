do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.calendar_connections'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.calendar_connections drop constraint %I', constraint_name);
  end if;

  alter table public.calendar_connections
    add constraint calendar_connections_provider_check
    check (provider in ('google', 'microsoft', 'nylas', 'apple', 'caldav', 'other'));
end $$;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.connected_account_tokens'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.connected_account_tokens drop constraint %I', constraint_name);
  end if;

  alter table public.connected_account_tokens
    add constraint connected_account_tokens_provider_check
    check (provider in ('google_calendar', 'microsoft_calendar', 'nylas', 'zoom'));
end $$;
