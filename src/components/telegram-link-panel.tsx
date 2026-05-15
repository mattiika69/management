"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

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
    const response = await fetch("/api/integrations/telegram/link-code", {
      method: "POST",
    });
    const body = (await response.json()) as LinkCode;
    setLoading(false);
    setLinkCode(
      response.ok ? body : { error: body.error ?? "Could not create link code." },
    );
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Connection"
        title="Connect Telegram"
        description="Generate a one-time code, then send it to the HyperOptimal Funnel bot."
      />
      <CardBody>
        <Button onClick={createCode} loading={loading}>
          {loading ? "Generating" : "Generate Telegram code"}
        </Button>

        {linkCode?.error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
            {linkCode.error}
          </div>
        ) : null}

        {linkCode?.code ? (
          <div className="mt-4 rounded-xl border border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-brand-700)]">
              Your link code
            </p>
            <p className="mt-2 font-mono text-[28px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
              {linkCode.code}
            </p>
            {linkCode.deepLink ? (
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--color-brand-700)] hover:underline"
                href={linkCode.deepLink}
              >
                Open Telegram bot
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            ) : (
              <p className="mt-3 text-[12px] text-[color:var(--color-brand-700)]/80">
                Use this code in Telegram to finish connecting.
              </p>
            )}
            <p className="mt-3 text-[11px] text-[color:var(--color-brand-700)]/70">
              Expires{" "}
              {linkCode.expiresAt
                ? new Date(linkCode.expiresAt).toLocaleString()
                : "soon"}
              .
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
