"use client";

import { FormEvent, useState } from "react";
import type { FunnelType } from "@/lib/hyperoptimal/data";
import type { LearningItemRow } from "@/lib/hyperoptimal/server";

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
      setMessage(body.error ?? "Learning item did not save.");
      return;
    }

    setStatus((current) => ({ ...current, [itemId]: "saved" }));
    setMessage("Learning item saved.");
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-lg border border-[#b7d7cf] bg-[#eef7f5] px-4 py-3 text-sm text-[#0f766e]" role="status">
          {message}
        </p>
      ) : null}

      {items.map((item) => (
        <form
          key={item.id}
          onSubmit={(event) => saveItem(event, item.id)}
          className="rounded-lg border border-[#e8ded2] bg-white p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_auto]">
            <label>
              <span className="mb-2 block text-sm font-medium text-[#4b4038]">Title</span>
              <input
                name="title"
                defaultValue={item.title}
                className="w-full rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm outline-none focus:border-[#e85b3c]"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[#4b4038]">Section</span>
              <select
                name="section"
                defaultValue={item.section}
                className="w-full rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm outline-none focus:border-[#e85b3c]"
              >
                <option value="learning">Learning</option>
                <option value="training">Training</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-[#4b4038]">Type</span>
              <select
                name="itemType"
                defaultValue={item.item_type}
                className="w-full rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm outline-none focus:border-[#e85b3c]"
              >
                <option value="learning">Learning</option>
                <option value="training">Training</option>
                <option value="assignment">Assignment</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={status[item.id] === "saving"}
                className="rounded-md bg-[#e85b3c] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status[item.id] === "saving" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[#4b4038]">Body</span>
            <textarea
              name="body"
              defaultValue={item.body}
              rows={4}
              className="w-full resize-y rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm leading-6 outline-none focus:border-[#e85b3c]"
            />
          </label>
        </form>
      ))}
    </div>
  );
}
