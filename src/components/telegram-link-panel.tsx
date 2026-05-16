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
    <div className="rounded-lg border border-[#e8ded2] bg-white p-6">
      <h2 className="font-serif text-2xl font-bold text-[#2d2620]">Connect Telegram</h2>
      <p className="mt-2 text-sm leading-6 text-[#8a7f73]">
        Generate a one-time code, then send it to the HyperOptimal Management Telegram bot.
      </p>
      <button
        type="button"
        onClick={createCode}
        disabled={loading}
        className="mt-5 rounded-md bg-[#e85b3c] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Generating..." : "Generate Telegram code"}
      </button>

      {linkCode?.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {linkCode.error}
        </p>
      ) : null}

      {linkCode?.code ? (
        <div className="mt-4 rounded-md border border-[#f0e7dc] bg-[#fffdf8] p-4 text-sm">
          <p className="text-[#8a7f73]">Code</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#2d2620]">{linkCode.code}</p>
          {linkCode.deepLink ? (
            <a className="mt-3 inline-block font-semibold text-[#d94c31]" href={linkCode.deepLink}>
              Open Telegram bot
            </a>
          ) : (
            <p className="mt-3 text-[#8a7f73]">
              Use this code in Telegram to finish connecting.
            </p>
          )}
          <p className="mt-3 text-xs text-[#8a7f73]">
            Expires {linkCode.expiresAt ? new Date(linkCode.expiresAt).toLocaleString() : "soon"}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
