create table if not exists public.billing_account_claims (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  stripe_customer_id text not null,
  stripe_checkout_session_id text not null unique,
  stripe_subscription_id text unique,
  price_id text,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'expired', 'revoked')),
  setup_email_status text not null default 'pending' check (setup_email_status in ('pending', 'sent', 'failed')),
  setup_email_error_message text,
  setup_sent_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_account_claims enable row level security;

revoke all on public.billing_account_claims from anon;
revoke all on public.billing_account_claims from authenticated;

create index if not exists billing_account_claims_email_idx
  on public.billing_account_claims (lower(email));

create index if not exists billing_account_claims_status_expires_idx
  on public.billing_account_claims (status, expires_at);

create index if not exists billing_account_claims_customer_idx
  on public.billing_account_claims (stripe_customer_id);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'touch_updated_at'
      and pronamespace = 'public'::regnamespace
  ) then
    drop trigger if exists touch_billing_account_claims_updated_at on public.billing_account_claims;
    create trigger touch_billing_account_claims_updated_at
    before update on public.billing_account_claims
    for each row execute function public.touch_updated_at();
  end if;
end $$;
