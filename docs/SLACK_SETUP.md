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
   - `groups:history` only if normal private-channel messages such as `app: status` should work.
4. Install the Slack app to the workspace.
5. Copy the **Bot User OAuth Token** as `SLACK_BOT_TOKEN`.
6. In **Event Subscriptions**, enable events.
7. Set the Request URL:
   - `https://THIS_APP_DOMAIN/api/slack/events`
8. Subscribe to bot events:
   - `app_mention`
   - `message.groups` only if normal private-channel prefixed messages should work.
9. In **Slash Commands**, create `/management` if you want slash commands.
10. Set the slash command Request URL:
    - `https://THIS_APP_DOMAIN/api/slack/commands`
11. Invite the bot to the private channel:
    - `/invite @BotName`

## Vercel Environment Variables

Set these in Vercel for Production and Preview:

```text
SLACK_APP_ID=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_BOT_TOKEN=
SLACK_ALLOWED_TEAM_ID=
SLACK_ALLOWED_CHANNEL_ID=
NEXT_PUBLIC_SITE_URL=
```

Never prefix Slack secrets with `NEXT_PUBLIC_`. `SLACK_ALLOWED_TEAM_ID` and `SLACK_ALLOWED_CHANNEL_ID` are an extra server-side allowlist. The database mapping below is still required.

## Supabase Channel Mapping

Add one row mapping the private Slack channel to the HyperOptimal Management organization. `tenant_id` and `organization_id` should be the same workspace ID used by this app.

```sql
insert into public.slack_channels (
  tenant_id,
  organization_id,
  slack_team_id,
  slack_channel_id,
  slack_channel_name,
  is_private,
  enabled,
  created_by_user_id,
  updated_by_user_id
)
values (
  'ORG_UUID',
  'ORG_UUID',
  'T0123456789',
  'C0123456789',
  'private-management-channel',
  true,
  true,
  'OWNER_AUTH_USER_UUID',
  'OWNER_AUTH_USER_UUID'
)
on conflict (slack_team_id, slack_channel_id)
do update set
  tenant_id = excluded.tenant_id,
  organization_id = excluded.organization_id,
  slack_channel_name = excluded.slack_channel_name,
  enabled = true,
  updated_by_user_id = excluded.updated_by_user_id,
  updated_at = now();
```

`created_by_user_id` should be an owner/admin in the organization when possible. The bot still allows private-channel conversation without every Slack user having an app login, but owner/admin attribution is useful for AI Agent requests and audits.

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
- `slack_agent_messages`: inbound Slack text and outbound bot response
- `slack_agent_actions`: Slack-triggered writes and confirmation-required requests
- `slack_action_audit_logs`: audit trail for Slack-triggered actions
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
