# Cross-Platform Agent Setup

HyperOptimal Management uses one shared agent runner for web chat, Slack, and Telegram.
Each platform adapter normalizes the inbound message, resolves the linked app user,
checks organization membership/RBAC, then calls the shared typed tool registry.

## Capability Matrix

| Capability | Web app | Slack | Telegram |
| --- | --- | --- | --- |
| Natural-language read/search | Supported | Supported after account link | Supported after account link |
| Create records | Supported with RBAC | Supported with RBAC | Supported with RBAC |
| Update records | Supported with RBAC and exact record id | Supported with RBAC and exact record id | Supported with RBAC and exact record id |
| Delete/archive records | Requires approval | Requires approval | Requires approval |
| Team invitations | Owners/admins, requires approval from chat | Owners/admins, linked Slack user, requires approval | Owners/admins, linked Telegram user, requires approval |
| Billing portal | Owners/admins, requires approval from chat | Owners/admins, linked Slack user, requires approval | Owners/admins, linked Telegram user, requires approval |
| Conversation history | `platform_conversations` + `agent_messages` | Same shared tables | Same shared tables |
| Tool/audit records | `agent_tool_runs`, `agent_approvals`, `audit_logs` | Same shared tables | Same shared tables |
| Message edit/delete on platform | App data only; no platform message delete | Bot can generally edit/delete only messages it posted | Bot can edit/delete only where Telegram bot permissions allow |

## Required Environment Variables

Required app/platform keys:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_MODEL` (aliases: `CLAUDE_MODEL`, `ANTHROPIC_MODEL`)
- `AI_PROVIDER_KEY` through either `VERCEL_OIDC_TOKEN` or `ANTHROPIC_API_KEY`
- `SLACK_SIGNING_SECRET`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`

Optional/manual production setup:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

No secrets should be committed. Put real values in Vercel/Supabase provider
configuration only.

Slack bot tokens are created by the OAuth install flow and stored server-side per
workspace. Do not configure a global Slack bot token environment variable.

## Slack URLs

The deployed endpoint currently verifies Slack URL challenges correctly at:

```text
https://management-mattiika69.vercel.app/api/slack/events
```

Use that as the Slack Event Subscriptions Request URL until custom DNS is fixed.

Do not use `https://app.scalingmetrics.com/api/slack/events`; that host is not
attached to this Vercel project and currently returns `DEPLOYMENT_NOT_FOUND`
with an expired certificate.

The live custom app domain is:

```text
https://app.hiretrainmanage.ai
```

Slack OAuth redirect URL:

```text
https://management-mattiika69.vercel.app/api/integrations/slack/oauth/callback
```

Slack slash command URL, if slash commands are enabled:

```text
https://management-mattiika69.vercel.app/api/slack/commands
```

Slack least-privilege scopes:

```text
chat:write
app_mentions:read
channels:read
channels:history
groups:read
groups:history
im:history
mpim:history
commands
```

Add `chat:write.public` only if the bot must post to public channels where it
has not been invited.

## Telegram Setup

Set the Telegram webhook with the configured secret token:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://management-mattiika69.vercel.app/api/telegram/webhook",
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'"
  }'
```

BotFather requirements:

- Enable `/setjoingroups`.
- Disable privacy mode when broad group reading is required, or require users
  to mention/reply to the bot.
- For channel/group write, edit, or delete actions, add the bot as an admin with
  the needed post/edit/delete rights.

## Security Flow

1. Platform webhook verifies the Slack signature or Telegram secret token.
2. Webhook events are deduped through `integration_processed_events`.
3. Platform account is resolved through `platform_accounts`.
4. Unlinked Slack/Telegram users get a linking prompt and cannot mutate data.
5. The shared runner enforces organization membership and role checks.
6. Destructive, billing, and permission-changing tools create `agent_approvals`.
7. Mutations write `agent_tool_runs`, `audit_logs`, and `admin_audit_log`.
