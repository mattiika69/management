"use client";

import { FormEvent, useState } from "react";
import type { FunnelType } from "@/lib/hyperoptimal/data";
import type { LearningItemRow } from "@/lib/hyperoptimal/server";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

type Status = Record<string, "idle" | "saving" | "saved" | "error">;

export function LearningList({
  funnelType,
  items,
}: {
  funnelType: FunnelType;
  items: LearningItemRow[];
}) {
  const [status, setStatus] = useState<Status>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");

  async function saveItem(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    setStatus((current) => ({ ...current, [itemId]: "saving" }));
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/learning", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        funnelType,
        title: formData.get("title"),
        body: formData.get("body"),
        section: formData.get("section"),
        itemType: formData.get("itemType"),
      }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus((current) => ({ ...current, [itemId]: "error" }));
      setMessageTone("error");
      setMessage(body.error ?? "Learning item did not save.");
      return;
    }

    setStatus((current) => ({ ...current, [itemId]: "saved" }));
    setMessageTone("info");
    setMessage("Learning item saved.");
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-[13px] ${
            messageTone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role="status"
        >
          {message}
        </div>
      ) : null}

      {items.map((item, index) => (
        <form
          key={item.id}
          onSubmit={(event) => saveItem(event, item.id)}
          className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[12px] font-semibold text-[color:var(--color-brand-700)] ring-1 ring-[color:var(--color-brand-100)]">
              {index + 1}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
              {item.section === "training" ? "Training" : "Learning"} item
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px]">
            <Field label="Title">
              <Input name="title" defaultValue={item.title} />
            </Field>
            <Field label="Section">
              <Select name="section" defaultValue={item.section}>
                <option value="learning">Learning</option>
                <option value="training">Training</option>
              </Select>
            </Field>
            <Field label="Type">
              <Select name="itemType" defaultValue={item.item_type}>
                <option value="learning">Learning</option>
                <option value="training">Training</option>
                <option value="assignment">Assignment</option>
              </Select>
            </Field>
          </div>

          <Field label="Body" className="mt-4">
            <Textarea name="body" defaultValue={item.body} rows={4} />
          </Field>

          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              loading={status[item.id] === "saving"}
              size="sm"
            >
              {status[item.id] === "saving" ? "Saving" : "Save"}
            </Button>
          </div>
        </form>
      ))}
    </div>
  );
}
