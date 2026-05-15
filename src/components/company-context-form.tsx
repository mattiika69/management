"use client";

import { FormEvent, useRef, useState } from "react";
import {
  COMPANY_FIELD_GROUPS,
  DEFAULT_COMPANY_CONTEXT,
  type CompanyContextData,
} from "@/lib/hyperoptimal/data";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Status = "idle" | "saving" | "saved" | "error";

export function CompanyContextForm({
  contextId,
  title = "AI Context Doc",
  status: initialContextStatus = "draft",
  initialData,
  updatedAt,
}: {
  contextId?: string;
  title?: string;
  status?: "draft" | "confirmed" | "archived";
  initialData: CompanyContextData;
  updatedAt: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [contextStatus, setContextStatus] = useState(initialContextStatus);
  const [contextTitle, setContextTitle] = useState(title);
  const [message, setMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(updatedAt);
  const formRef = useRef<HTMLFormElement>(null);

  async function saveContext(nextStatus?: "draft" | "confirmed") {
    if (!formRef.current) return;
    setStatus("saving");
    setMessage("");

    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(
      Object.keys(DEFAULT_COMPANY_CONTEXT).map((key) => [
        key,
        String(formData.get(key) ?? ""),
      ]),
    );

    const response = await fetch("/api/company-context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: contextId,
        title: contextTitle,
        status:
          nextStatus ?? (contextStatus === "archived" ? "draft" : contextStatus),
        data,
      }),
    });
    const body = (await response.json()) as {
      error?: string;
      updatedAt?: string;
      context?: { status?: "draft" | "confirmed" | "archived" };
    };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Company document did not save.");
      return;
    }

    setStatus("saved");
    if (body.context?.status) setContextStatus(body.context.status);
    setLastSavedAt(body.updatedAt ?? new Date().toISOString());
    setMessage(nextStatus === "confirmed" ? "Confirmed and saved." : "Saved.");
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void saveContext();
      }}
      className="space-y-5"
    >
      <div className="sticky top-0 z-10 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 px-5 py-4 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[280px] flex-1">
            <Field label="Context name">
              <Input
                value={contextTitle}
                onChange={(event) => setContextTitle(event.currentTarget.value)}
              />
            </Field>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-[color:var(--color-ink-500)]">
              <Badge tone={contextStatus === "confirmed" ? "success" : "neutral"}>
                {contextStatus === "confirmed" ? "Confirmed" : "Draft"}
              </Badge>
              <span>
                Last saved{" "}
                <span className="font-medium text-[color:var(--color-ink-700)]">
                  {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "not yet"}
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="secondary"
              loading={status === "saving"}
            >
              {status === "saving" ? "Saving" : "Save draft"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void saveContext("confirmed");
              }}
              disabled={status === "saving"}
            >
              Confirm context
            </Button>
          </div>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-[13px] ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role="status"
        >
          {message}
        </div>
      ) : null}

      <div className="space-y-5">
        {COMPANY_FIELD_GROUPS.map((group) => (
          <section
            key={group.title}
            className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-[color:var(--color-brand-500)]" />
              <h2 className="text-[18px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                {group.title}
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {group.fields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  className={field.multiline ? "lg:col-span-2" : ""}
                >
                  {field.multiline ? (
                    <Textarea
                      name={field.key}
                      defaultValue={initialData[field.key] ?? ""}
                      rows={5}
                    />
                  ) : (
                    <Input
                      name={field.key}
                      defaultValue={initialData[field.key] ?? ""}
                    />
                  )}
                </Field>
              ))}
            </div>
          </section>
        ))}
      </div>
    </form>
  );
}
