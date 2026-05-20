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
3. Set the webhook URL:

```sh
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -F "url=https://THIS_APP_DOMAIN/api/telegram/webhook" \
  -F "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

The legacy compatibility route `/api/integrations/telegram/webhook` also works, but new setup should use `/api/telegram/webhook`.

4. In the web app, go to Settings > Telegram and generate a one-time code.
5. Add the bot to the private Telegram group or chat where it should operate.
6. Send the one-time code to the bot in that chat. The webhook verifies the code server-side and links that chat to the signed-in user's organization.

## Vercel Environment Variables

Set these in Vercel for Production and Preview:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
```

Never prefix Telegram secrets with `NEXT_PUBLIC_`. Users should not paste Telegram tokens or chat IDs into the app; the one-time code links the chat server-side.

## Supabase Chat Mapping

Settings > Telegram creates a short-lived `telegram_link_codes` row. The raw code is shown once to the signed-in user; the database stores only the hashed code value. When the user sends that code to the bot, the webhook atomically marks the code used and creates or updates `integration_connections` for that chat and organization.

No normal user should manually provide Telegram tokens or chat IDs.

## Routes

- Telegram webhook: `/api/telegram/webhook`
- Existing compatibility route: `/api/integrations/telegram/webhook`

Every Telegram request is verified with `TELEGRAM_WEBHOOK_SECRET` when configured. Requests from chats without a valid Supabase connection are ignored except for valid one-time link codes.

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
