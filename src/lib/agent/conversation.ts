import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_COMPANY_CONTEXT,
  companyContextToText,
  type CompanyContextData,
} from "@/lib/hyperoptimal/data";
import { normalizeCompanyContext } from "@/lib/hyperoptimal/server";
import {
  formatLearningsForPrompt,
  learningColumns,
  type LearningItem,
} from "@/lib/learnings/server";

type AgentProvider = "web" | "slack" | "telegram";

type AgentConversationInput = {
  supabase: SupabaseClient;
  organizationId: string;
  actorUserId: string | null;
  provider: AgentProvider;
  message: string;
  sourceLabel?: string | null;
  sourceExternalId?: string | null;
  sourceThreadId?: string | null;
  sourceChannelId?: string | null;
  sourceUserId?: string | null;
};

export type AgentConversationResult = {
  command: "agent_chat" | "agent_learning";
  text: string;
  status: "sent" | "saved" | "failed";
  savedLearning?: LearningItem;
};

type ContextRow = {
  id: string;
  title: string;
  status: "draft" | "confirmed" | "archived";
  data: CompanyContextData;
};

type SaveInstruction = {
  title: string;
  body: string;
};

function anthropicMaxTokens() {
  const parsed = Number(process.env.ANTHROPIC_MAX_TOKENS || 1200);
  if (!Number.isFinite(parsed) || parsed < 1) return 1200;
  return Math.min(Math.floor(parsed), 4000);
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const content = Array.isArray(record.content) ? record.content : [];

  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const raw = item as Record<string, unknown>;
      return raw.type === "text" && typeof raw.text === "string" ? raw.text : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sourceLabel(provider: AgentProvider) {
  if (provider === "slack") return "Slack";
  if (provider === "telegram") return "Telegram";
  return "App";
}

function compactTitle(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > 88 ? `${cleaned.slice(0, 85).trim()}...` : cleaned;
}

function parseSaveInstruction(message: string): SaveInstruction | null {
  const trimmed = message.trim();
  const match = trimmed.match(/^(?:\/)?(?:save|remember|learn|store|note)\b(?:\s+(?:this|that))?\s*:?\s*([\s\S]*)$/i);
  if (!match) return null;

  const content = match[1]?.trim();
  if (!content) {
    return { title: "", body: "" };
  }

  if (content.includes("|")) {
    const [rawTitle, ...rawBody] = content.split("|");
    return {
      title: compactTitle(rawTitle, "Saved AI Agent Memory"),
      body: rawBody.join("|").trim(),
    };
  }

  const [firstLine, ...rest] = content.split(/\n+/);
  return {
    title: compactTitle(firstLine, "Saved AI Agent Memory"),
    body: rest.join("\n").trim() || content,
  };
}

async function loadCompanyContext(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data: confirmed, error: confirmedError } = await supabase
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("organization_id", organizationId)
    .eq("status", "confirmed")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<ContextRow[]>();

  if (confirmedError) throw new Error(confirmedError.message);
  if (confirmed?.[0]) {
    return { ...confirmed[0], data: normalizeCompanyContext(confirmed[0].data) };
  }

  const { data, error } = await supabase
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<ContextRow[]>();

  if (error) throw new Error(error.message);
  return data?.[0] ? { ...data[0], data: normalizeCompanyContext(data[0].data) } : null;
}

async function loadLearnings(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("learning_items")
    .select(learningColumns)
    .eq("tenant_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(20)
    .returns<LearningItem[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function saveLearning(input: AgentConversationInput, instruction: SaveInstruction) {
  const title = instruction.title.trim();
  if (!title) {
    throw new Error("Add what you want saved after save or remember.");
  }

  const { data, error } = await input.supabase
    .from("learning_items")
    .insert({
      tenant_id: input.organizationId,
      organization_id: input.organizationId,
      title,
      body: instruction.body.trim(),
      category: "general",
      source_provider: input.provider,
      source_label: input.sourceLabel?.trim() || sourceLabel(input.provider),
      source_external_id: input.sourceExternalId ?? null,
      source_thread_id: input.sourceThreadId ?? null,
      source_channel_id: input.sourceChannelId ?? null,
      source_user_id: input.sourceUserId ?? null,
      sync_status: "synced",
      created_by_user_id: input.actorUserId,
      updated_by_user_id: input.actorUserId,
    })
    .select(learningColumns)
    .single<LearningItem>();

  if (error) throw new Error(error.message);
  return data;
}

async function generateAgentReply(input: AgentConversationInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model =
    process.env.CLAUDE_MODEL?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim() ||
    "claude-sonnet-4-5";

  const context = await loadCompanyContext(input.supabase, input.organizationId);
  const learnings = await loadLearnings(input.supabase, input.organizationId);
  const contextText = companyContextToText(context?.data ?? DEFAULT_COMPANY_CONTEXT) || "No AI Context Document content has been saved yet.";
  const learningText = formatLearningsForPrompt(learnings) || "No learnings have been saved yet.";

  if (!apiKey) {
    return [
      "I can save AI Agent memory and handle explicit app commands from here.",
      "Live conversational replies are not available yet. Say `save Title | What to remember` to add memory, or use `/agent request ...` to create a request.",
    ].join("\n");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: anthropicMaxTokens(),
      system: [
        "You are the HyperOptimal Management AI Agent.",
        "Use the AI Context Document and saved Learnings in every answer.",
        "Be concise, operational, and specific. Give direct next steps when useful.",
        "Never claim that memory, records, or app data were saved unless the tool message says they were saved.",
        "If the user wants durable memory, tell them to start with save or remember.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [
            "# AI Context Document",
            contextText,
            "",
            "# Saved Learnings",
            learningText,
            "",
            "# Current Message",
            input.message.trim(),
          ].join("\n"),
        },
      ],
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      body && typeof body === "object" && "error" in body
        ? JSON.stringify((body as { error: unknown }).error)
        : "AI Agent reply failed.";
    throw new Error(errorMessage);
  }

  return extractResponseText(body) || "I could not generate a response.";
}

export async function handleAgentConversation(
  input: AgentConversationInput,
): Promise<AgentConversationResult> {
  const message = input.message.trim();
  if (!message) {
    return {
      command: "agent_chat",
      text: "Send a message or say `save Title | What to remember`.",
      status: "sent",
    };
  }

  const saveInstruction = parseSaveInstruction(message);
  if (saveInstruction) {
    try {
      const savedLearning = await saveLearning(input, saveInstruction);
      return {
        command: "agent_learning",
        text: `Saved to AI Agent memory: ${savedLearning.title}`,
        status: "saved",
        savedLearning,
      };
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "AI Agent memory could not be saved.";
      return {
        command: "agent_learning",
        text: `AI Agent memory was not saved: ${messageText}`,
        status: "failed",
      };
    }
  }

  try {
    const text = await generateAgentReply(input);
    return {
      command: "agent_chat",
      text,
      status: "sent",
    };
  } catch {
    return {
      command: "agent_chat",
      text: "AI Agent could not respond right now. Try again in a minute.",
      status: "failed",
    };
  }
}
