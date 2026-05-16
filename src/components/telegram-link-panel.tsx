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

  async function createCode() {
    setLoading(true);
    const response = await fetch("/api/integrations/telegram/link-code", { method: "POST" });
    const body = (await response.json()) as LinkCode;
    setLoading(false);
    setLinkCode(response.ok ? body : { error: body.error ?? "Could not create link code." });
  }

  return (
    <div className={compact ? "" : "settings-card-pad"}>
      {!compact ? (
        <>
          <h2 className="text-[15px] font-bold text-gray-950">Connect Telegram</h2>
          <p className="mt-2 text-[13px] leading-6 text-gray-600">
            Generate a one-time code, then send it to the HyperOptimal Management Telegram bot.
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
          <p className="text-gray-600">Code</p>
          <p className="mt-1 font-mono text-xl font-semibold text-gray-950">{linkCode.code}</p>
          {linkCode.deepLink ? (
            <a className="mt-3 inline-block font-semibold text-blue-700" href={linkCode.deepLink}>
              Open Telegram bot
            </a>
          ) : (
            <p className="mt-3 text-gray-600">
              Use this code in Telegram to finish connecting.
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Expires {linkCode.expiresAt ? new Date(linkCode.expiresAt).toLocaleString() : "soon"}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
