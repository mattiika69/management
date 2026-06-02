"use client";

import { useState } from "react";

type LinkCode = {
  code?: string;
  expiresAt?: string;
  deepLink?: string | null;
  botUsername?: string | null;
  error?: string;
};

export function TelegramLinkPanel({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [copied, setCopied] = useState(false);
  const telegramCommand = linkCode?.code ? `/start ${linkCode.code}` : "";

  async function createCode() {
    setLoading(true);
    setCopied(false);
    const response = await fetch("/api/integrations/telegram/link-code", { method: "POST" });
    const body = (await response.json()) as LinkCode;
    setLoading(false);
    setLinkCode(response.ok ? body : { error: body.error ?? "Could not create link code." });
  }

  async function copyCommand() {
    if (!telegramCommand) return;
    try {
      await navigator.clipboard.writeText(telegramCommand);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={compact ? "" : "settings-card-pad"}>
      {!compact ? (
        <>
          <h2 className="text-[15px] font-bold text-gray-950">Connect Telegram</h2>
          <p className="mt-2 text-[13px] leading-6 text-gray-600">
            Generate a one-time command, then send it to the HyperOptimal Management Telegram bot.
          </p>
        </>
      ) : null}
      <button
        type="button"
        onClick={createCode}
        disabled={loading}
        className={`settings-button-dark ${compact ? "" : "mt-5"}`}
      >
        {loading ? "Generating..." : "Generate Telegram code"}
      </button>

      {linkCode?.error ? (
        <p className="mt-4 rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {linkCode.error}
        </p>
      ) : null}

      {linkCode?.code ? (
        <div className="mt-4 rounded-[8px] border border-[#d9e1ee] bg-[#f8fafc] p-4 text-[13px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-700">Telegram command</p>
              <p className="mt-2 font-mono text-[18px] font-semibold text-gray-950">{telegramCommand}</p>
            </div>
            <button type="button" onClick={copyCommand} className="settings-button-outline text-[12px]">
              {copied ? "Copied" : "Copy command"}
            </button>
          </div>
          {linkCode.botUsername ? (
            <p className="mt-3 text-xs font-semibold text-gray-600">Bot: @{linkCode.botUsername}</p>
          ) : null}
          {linkCode.deepLink ? (
            <a className="mt-3 inline-block font-semibold text-blue-700" href={linkCode.deepLink}>
              Open Telegram bot in a private chat
            </a>
          ) : (
            <p className="mt-3 text-gray-600">
              Use this code in Telegram to finish connecting.
            </p>
          )}
          <p className="mt-3 text-[12px] leading-5 text-gray-600">
            For a group, supergroup, or channel, add the bot to the chat, then send this command in that chat. If the
            bot needs to post, edit, or delete channel messages, make it an admin with those rights.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            Expires {linkCode.expiresAt ? new Date(linkCode.expiresAt).toLocaleString() : "soon"}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
