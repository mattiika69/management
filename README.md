# HyperOptimal Management

A Next.js management workspace backed by Supabase and ready for Vercel.

## Architecture

`ARCHITECTURE.md` is the authoritative HyperOptimal SaaS app standard for this
repo. `INFRASTRUCTURE.md` tracks this app's current cloud wiring and migration
state.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

Useful checks:

```sh
npm run lint
npm run verify:supabase-admin
npm run typecheck
npm run build
npm run test:e2e:public
```

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

Supabase Auth is configured to send HyperOptimal Management account emails through
Resend SMTP. The tracked config includes production/local redirect URLs and
templates for signup confirmation, magic login, password reset, workspace
invites, email changes, and password change notifications. Push auth email
settings with `RESEND_API_KEY` available in the shell:

```sh
supabase config push
```

## Slack Bot

This app has a one-off private-channel Slack bot setup documented in
[`docs/SLACK_SETUP.md`](docs/SLACK_SETUP.md). Configure one Slack app for
HyperOptimal Management. Users connect Slack from Settings through OAuth; the
callback stores the selected workspace/channel and bot token server-side.
Slack requests use `/api/slack/events` plus `/api/slack/commands`.

## Telegram Bot

This app has a one-off private Telegram bot setup documented in
[`docs/TELEGRAM_SETUP.md`](docs/TELEGRAM_SETUP.md). Configure one Telegram bot
for HyperOptimal Management. Users connect Telegram from Settings by generating
a short-lived code and sending it to the bot. Slack and Telegram share the same
server-side agent tools.

## Vercel

Set these environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ONBOARDING_PRICE_ID`
- `RESEND_FROM_NAME`
- `ROEZAN_API_BASE_URL`
- `CLAUDE_MODEL`
- `INTEGRATION_SECRET_KEY`
- `SCHEDULE_WORKER_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_APP_ID`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ROEZAN_API_KEY`

Then deploy with:

```sh
vercel --prod
```

## GitHub Actions

Pushes to `main` and pull requests run `.github/workflows/playwright.yml`.
The workflow installs dependencies on Linux, runs lint, typecheck, build, and a
Playwright production smoke test against `PLAYWRIGHT_BASE_URL`. Set the
repository variable `PLAYWRIGHT_BASE_URL` to override the default production URL.
It also validates that the Supabase repository secrets required by the build are
present before the checks run, and trusted runs verify the MVP admin profile and
core Supabase tables with the server-only service-role secret.
