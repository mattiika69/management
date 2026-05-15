# HyperOptimal Funnel

A minimal Next.js lead capture app backed by Supabase and ready for Vercel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

## Account and admin

Core account routes are included:

- `/signup`
- `/get-started`
- `/settings/team`
- `/invite/[token]`
- `/login`
- `/reset-password`
- `/update-password`
- `/admin`
- `/privacy`
- `/terms`

## Supabase

The project includes migrations for authenticated, tenant-scoped lead capture,
organization memberships, team invitations, RLS policies, and Stripe billing
records:

```sh
supabase db push
```

Supabase Auth is configured to send HyperOptimal Funnel account emails through
Resend SMTP. The tracked config includes production/local redirect URLs and
templates for signup confirmation, magic login, password reset, workspace
invites, email changes, and password change notifications. Push auth email
settings with `RESEND_API_KEY` available in the shell:

```sh
supabase config push
```

## Vercel

Set these environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ROEZAN_API_KEY`

Then deploy with:

```sh
vercel --prod
```
