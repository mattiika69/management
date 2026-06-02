import type { AgentToolInput, AgentToolName } from "@/lib/agent/types";

export type PlannedAgentStep = {
  toolName: AgentToolName;
  input: AgentToolInput;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function emailFrom(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
}

function recordTypeFrom(text: string) {
  const lower = text.toLowerCase();
  if (/\b(employee|team member|staff)\b/.test(lower)) return "employees";
  if (/\b(memory|learning|note|preference)\b/.test(lower)) return "learning_items";
  if (/\b(agent request|task|todo|follow-up|follow up)\b/.test(lower)) return "agent_requests";
  if (/\b(meeting|agenda|decision)\b/.test(lower)) return "meetings";
  return "app_data";
}

function recordIdFrom(text: string) {
  return text.match(/\b[0-9a-f]{8}-[0-9a-f-]{8,}\b/i)?.[0] ?? "";
}

function titleAfter(prefix: RegExp, text: string) {
  return clean(text.replace(prefix, ""));
}

export function planAgentSteps(message: string): PlannedAgentStep[] {
  const text = clean(message);
  const lower = text.toLowerCase();
  if (!text) return [];

  if (/^(help|what can you do)\b/i.test(text)) {
    return [{ toolName: "summarize_activity", input: { mode: "help" } }];
  }

  const confirmMatch = text.match(/^(?:confirm|approve)\s+([0-9a-f-]{8,36})$/i);
  if (confirmMatch) {
    return [{ toolName: "confirm_approval", input: { approvalId: confirmMatch[1] } }];
  }

  if (/^(status|summary|summarize|summarize overdue work|what happened|what changed|metrics)\b/i.test(text)) {
    return [{ toolName: "summarize_activity", input: { query: text } }];
  }

  const inviteEmail = emailFrom(text);
  if (/\binvite\b/i.test(text) && inviteEmail) {
    const role = /\badmin\b/i.test(text) ? "admin" : /\bviewer\b/i.test(text) ? "viewer" : "member";
    return [{ toolName: "invite_team_member", input: { email: inviteEmail, role } }];
  }

  if (/\b(billing portal|update payment|payment method|invoice|cancel subscription|change plan|upgrade|downgrade)\b/i.test(lower)) {
    return [{ toolName: "create_billing_portal_session", input: { reason: text } }];
  }

  const deleteMatch = text.match(/^(?:delete|remove|archive)\s+(.+)$/i);
  if (deleteMatch) {
    return [{
      toolName: "delete_record",
      input: {
        recordType: recordTypeFrom(deleteMatch[1]),
        recordId: recordIdFrom(deleteMatch[1]),
        query: clean(deleteMatch[1]),
      },
    }];
  }

  const updateMatch = text.match(/^(?:update|edit|change)\s+(.+)$/i);
  if (updateMatch) {
    return [{
      toolName: "update_record",
      input: {
        recordType: recordTypeFrom(updateMatch[1]),
        recordId: recordIdFrom(updateMatch[1]),
        query: clean(updateMatch[1]),
      },
    }];
  }

  if (/^(?:remember|save|store|note)\b/i.test(text)) {
    const content = titleAfter(/^(?:remember|save|store|note)\b\s*:?\s*/i, text);
    const [rawTitle, ...rawBody] = content.split("|");
    return [{
      toolName: "create_record",
      input: {
        recordType: "learning_items",
        data: {
          title: clean(rawTitle || "Saved agent memory"),
          body: clean(rawBody.join("|") || content),
          category: "general",
        },
      },
    }];
  }

  if (/^(?:create|add|make)\b/i.test(text)) {
    const raw = titleAfter(/^(?:create|add|make)\b\s*/i, text);
    const type = recordTypeFrom(raw);
    if (type === "employees") {
      return [{
        toolName: "create_record",
        input: {
          recordType: "employees",
          data: {
            fullName: clean(raw.replace(/\b(employee|team member|staff)\b/gi, "")),
            email: emailFrom(raw) || null,
          },
        },
      }];
    }
    return [{
      toolName: "create_record",
      input: {
        recordType: type === "app_data" ? "agent_requests" : type,
        data: {
          title: raw,
          requestText: raw,
          riskLevel: /\b(delete|billing|permission|role|admin|remove)\b/i.test(raw) ? "high" : "normal",
        },
      },
    }];
  }

  const searchMatch = text.match(/^(?:find|search|look up|show|get)\s+(.+)$/i);
  if (searchMatch) {
    return [{
      toolName: "search_app_data",
      input: { query: clean(searchMatch[1]), recordType: recordTypeFrom(searchMatch[1]) },
    }];
  }

  if (recordIdFrom(text)) {
    return [{
      toolName: "get_record",
      input: { recordType: recordTypeFrom(text), recordId: recordIdFrom(text) },
    }];
  }

  return [{ toolName: "search_app_data", input: { query: text, recordType: "app_data" } }];
}
