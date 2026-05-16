"use client";

import { useState } from "react";

type LinkCode = {
  code?: string;
  expiresAt?: string;
  deepLink?: string | null;
  botUsername?: string | null;
  error?: string;
};

export function TelegramLinkPanel() {
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
    <div className="rounded-[7px] border border-gray-300 bg-white p-5 shadow-sm">
      <h2 className="text-[15px] font-bold text-gray-950">Connect Telegram</h2>
      <p className="mt-2 text-[13px] leading-6 text-gray-600">
        Generate a one-time code, then send it to the HyperOptimal Management Telegram bot.
      </p>
      <button
        type="button"
        onClick={createCode}
        disabled={loading}
        className="mt-5 rounded-[5px] bg-gray-950 px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {loading ? "Generating..." : "Generate Telegram code"}
      </button>

      {linkCode?.error ? (
        <p className="mt-4 rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {linkCode.error}
        </p>
      ) : null}

      {linkCode?.code ? (
        <div className="mt-4 rounded-[5px] border border-gray-200 bg-gray-50 p-4 text-[13px]">
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
