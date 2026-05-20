# HyperOptimal Management Telegram Bot Setup

This app uses one Telegram bot for HyperOptimal Management only. Do not reuse this bot for other HyperOptimal products. Telegram is the chat interface; Supabase/Postgres remains the source of truth for all persistent app data.

## What The Bot Supports

- `/help`
- `/status`
- `What changed today?`
- `Show me this week's metrics.`
- `Find Frank`
- `Remember ICP | Our best customers are gym owners.`

The Telegram bot uses the same private-channel agent tools as Slack. New read/write capabilities must be added to the shared server-side agent layer first, then exposed through Slack and Telegram adapters.

The initial safe write is AI Agent memory: `save` and `remember` create `learning_items` rows in Supabase. Destructive or high-risk requests are refused from Telegram and must be confirmed in the app.

## Telegram Bot Configuration

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Copy the bot token as `TELEGRAM_BOT_TOKEN`.
3. Add the bot to the private Telegram group or chat.
4. Get the Telegram chat ID for that group/chat.
5. Set the webhook URL:

```sh
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -F "url=https://THIS_APP_DOMAIN/api/telegram/webhook" \
  -F "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

The legacy compatibility route `/api/integrations/telegram/webhook` also works, but new setup should use `/api/telegram/webhook`.

## Vercel Environment Variables

Set these in Vercel for Production and Preview:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_CHAT_ID=
NEXT_PUBLIC_SITE_URL=
```

Never prefix Telegram secrets with `NEXT_PUBLIC_`. `TELEGRAM_ALLOWED_CHAT_ID` is a server-side allowlist. The Supabase connection mapping below is still required.

## Supabase Chat Mapping

The easiest setup path is to connect Telegram from Settings > Telegram in the app. That creates a `telegram_link_codes` row, then `/start CODE` creates the `integration_connections` row.

If you need to map manually, add one active connection:

```sql
insert into public.integration_connections (
  organization_id,
  provider,
  external_team_id,
  external_channel_id,
  external_user_id,
  display_name,
  status,
  config
)
values (
  'ORG_UUID',
  'telegram',
  '',
  'TELEGRAM_CHAT_ID',
  null,
  'HyperOptimal Management Telegram',
  'active',
  '{}'::jsonb
)
on conflict (provider, external_team_id, external_channel_id)
do update set
  organization_id = excluded.organization_id,
  display_name = excluded.display_name,
  status = 'active',
  revoked_at = null,
  updated_at = now();
```

## Routes

- Telegram webhook: `/api/telegram/webhook`
- Existing compatibility route: `/api/integrations/telegram/webhook`

Every Telegram request is verified with `TELEGRAM_WEBHOOK_SECRET` when configured. Requests from chats outside `TELEGRAM_ALLOWED_CHAT_ID` are ignored.

## Persistence And Audit

The Telegram bot writes durable records to Supabase:

- `integration_connections`: private Telegram chat to organization mapping
- `integration_messages`: inbound Telegram text and outbound bot responses
- `integration_processed_events`: webhook dedupe
- `admin_audit_log`: write/high-risk action audit records
- `learning_items`: saved AI Agent memory from Telegram

RLS remains enabled. Webhook routes use trusted server-side code and refuse requests from unconfigured chats.

## Test Checklist

After deploying:

1. In Telegram, send `/help`.
2. Send `/status`.
3. Send `What changed today?`.
4. Send `Show me this week's metrics.`
5. Send `Find Matt`.
6. Send `Remember Telegram Test | This should appear in AI Agent learnings.`
7. Confirm `learning_items`, `integration_messages`, and `admin_audit_log` rows exist in Supabase.
8. Try the same command from another chat and confirm the bot ignores it.
