"use client";

import { FormEvent, useRef, useState } from "react";
import {
  COMPANY_FIELD_GROUPS,
  DEFAULT_COMPANY_CONTEXT,
  type CompanyContextData,
} from "@/lib/hyperoptimal/data";

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
        status: nextStatus ?? (contextStatus === "archived" ? "draft" : contextStatus),
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
      <div className="settings-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-[260px] flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#8490a3]">
            Context Name
          </label>
          <input
            value={contextTitle}
            onChange={(event) => setContextTitle(event.currentTarget.value)}
            className="settings-field mt-1 w-full"
          />
          <p className="mt-2 text-xs text-[#6f6257]">
            {contextStatus === "confirmed" ? "Confirmed" : "Draft"} · Last saved{" "}
            <span className="font-medium text-[#2d2620]">
              {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "not yet"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={status === "saving"}
            className="settings-button-outline"
          >
            {status === "saving" ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => {
              void saveContext("confirmed");
            }}
            disabled={status === "saving"}
            className="settings-button-dark"
          >
            Confirm Context
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[#b7d7cf] bg-[#eef7f5] text-[#0f766e]"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      {COMPANY_FIELD_GROUPS.map((group) => (
        <section key={group.title} className="settings-card-pad">
          <h2 className="text-2xl font-bold text-[#171717]">{group.title}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {group.fields.map((field) => (
              <label
                key={field.key}
                className={field.multiline ? "lg:col-span-2" : ""}
              >
                <span className="mb-2 block text-sm font-medium text-[#4b4038]">
                  {field.label}
                </span>
                {field.multiline ? (
                  <textarea
                    name={field.key}
                    defaultValue={initialData[field.key] ?? ""}
                    rows={5}
                    className="min-h-28 w-full resize-y border border-[#d9d0c3] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f766e]"
                  />
                ) : (
                  <input
                    name={field.key}
                    defaultValue={initialData[field.key] ?? ""}
                    className="w-full border border-[#d9d0c3] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f766e]"
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
    </form>
  );
}
