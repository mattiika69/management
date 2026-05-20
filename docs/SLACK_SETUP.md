# HyperOptimal Management Slack Bot Setup

This app uses one Slack app for HyperOptimal Management only. Do not reuse this setup for other HyperOptimal products. Slack is the chat interface; Supabase/Postgres remains the source of truth for all persistent data.

## What The Bot Supports

- `@BotName help`
- `@BotName status`
- `@BotName summarize today`
- `@BotName find Frank`
- `@BotName show metrics`
- `app: status`
- `app: summarize today`
- `bot: find Frank`
- `/management status` if the slash command is enabled
- `save Title | What the AI Agent should remember`

The bot can read tenant-scoped Management data, including team counts, employees, meetings, training programs, recent reviews, recent learnings, and basic Management metrics. The initial safe write is AI Agent memory: `save` and `remember` create `learning_items` rows in Supabase.

Slack and Telegram use the same private-channel agent tools. New agent capabilities should be added to the shared server-side agent layer first, then exposed through Slack and Telegram adapters. Provider adapters should only handle transport-specific verification, parsing, and response delivery.

Destructive or high-risk Slack requests are refused from chat and must be confirmed in the app. Examples include approve, cancel, edit, set, run, delete, remove, archive, disconnect, and revoke.

## Slack App Configuration

1. Open the matching Slack app in [api.slack.com/apps](https://api.slack.com/apps).
2. In **Basic Information**, copy:
   - `SLACK_APP_ID`
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_SIGNING_SECRET`
3. In **OAuth & Permissions**, add bot scopes:
   - `chat:write`
   - `app_mentions:read`
   - `commands`
   - `groups:read`
   - `incoming-webhook`
   - `groups:history` only if normal private-channel messages such as `app: status` should work.
4. In the web app, go to Settings > Slack and click **Connect Slack**.
5. Slack will ask the user to approve the app and select the private channel where the bot should operate.
6. The OAuth callback stores the selected team/channel and bot token in Supabase server-side.
7. In **Event Subscriptions**, enable events.
8. Set the Request URL:
   - `https://THIS_APP_DOMAIN/api/slack/events`
9. Subscribe to bot events:
   - `app_mention`
   - `message.groups` only if normal private-channel prefixed messages should work.
10. In **Slash Commands**, create `/management` if you want slash commands.
11. Set the slash command Request URL:
    - `https://THIS_APP_DOMAIN/api/slack/commands`
12. Invite the bot to the private channel:
    - `/invite @BotName`

## Vercel Environment Variables

Set these in Vercel for Production and Preview:

```text
SLACK_APP_ID=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_BOT_SCOPES=app_mentions:read,chat:write,commands,groups:read,groups:history,incoming-webhook
NEXT_PUBLIC_SITE_URL=
```

Never prefix Slack secrets with `NEXT_PUBLIC_`. Users should not paste bot tokens, channel IDs, or team IDs into the app; OAuth stores provider tokens and channel mappings server-side.

## Supabase Channel Mapping

The Slack OAuth callback creates or updates the Supabase records automatically:

- `integration_connections`: normalized Slack team/channel connection for the signed-in user's organization
- `integration_secrets`: server-only bot token and incoming webhook URL
- `slack_channels`: private Slack channel mapping used by the agent runtime
- `admin_audit_log`: who connected Slack, when, and to which team/channel

No normal user should manually provide Slack tokens, channel IDs, or team IDs.

## Routes

- Slack events: `/api/slack/events`
- Slash commands: `/api/slack/commands`
- Existing compatibility routes:
  - `/api/integrations/slack/events`
  - `/api/integrations/slack/commands`

Every Slack request is verified with `SLACK_SIGNING_SECRET`. Replayed requests older than five minutes are rejected.

## Persistence And Audit

The Slack bot writes durable records to Supabase:

- `slack_channels`: private channel to organization mapping
- `integration_connections`: normalized provider/channel connection
- `integration_messages`: inbound Slack text and outbound bot response
- `integration_processed_events`: webhook and slash command dedupe
- `admin_audit_log`: write/high-risk action audit records
- `learning_items`: saved AI Agent memory from Slack

RLS remains enabled. Server routes use trusted server-side code and refuse requests from unconfigured teams or channels.

## Test Checklist

After deploying:

1. In Slack, run `@BotName help`.
2. Run `@BotName status`.
3. Run `@BotName show metrics`.
4. Run `@BotName find Matt`.
5. Run `app: status` in the configured private channel if `message.groups` is enabled.
6. Run `/management status` if the slash command is enabled.
7. Run `save Slack Test | This should appear in AI Agent learnings.`
8. Confirm the `learning_items`, `slack_agent_messages`, and `slack_action_audit_logs` rows exist in Supabase.
9. Try the same command from another channel and confirm the bot refuses or ignores it.
