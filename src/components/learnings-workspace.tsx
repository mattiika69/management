"use client";

import { FormEvent, useMemo, useState } from "react";
import type { LearningItem } from "@/lib/learnings/server";

type LearningForm = {
  title: string;
  body: string;
  category: string;
  sourceProvider: "web" | "slack" | "telegram";
  sourceLabel: string;
};

const blankForm: LearningForm = {
  title: "",
  body: "",
  category: "general",
  sourceProvider: "web",
  sourceLabel: "",
};

const categories = ["general", "sales", "hiring", "training", "meetings", "content", "operations"];

function sourceLabel(value: LearningItem["source_provider"]) {
  if (value === "slack") return "Slack";
  if (value === "telegram") return "Telegram";
  return "Web";
}

function toForm(item: LearningItem): LearningForm {
  return {
    title: item.title,
    body: item.body,
    category: item.category || "general",
    sourceProvider: item.source_provider,
    sourceLabel: item.source_label,
  };
}

export function LearningsWorkspace({
  initialItems,
}: {
  initialItems: LearningItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<LearningForm>(blankForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [items],
  );

  function startNew() {
    setEditingId("");
    setForm(blankForm);
    setStatus("");
    setError("");
  }

  function startEdit(item: LearningItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setStatus("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    const method = editingId ? "PATCH" : "POST";
    const response = await fetch("/api/learning", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, itemId: editingId || undefined }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      learningItem?: LearningItem;
      error?: string;
    };

    if (!response.ok || !body.learningItem) {
      setStatus("");
      setError(body.error ?? "Learning could not be saved.");
      return;
    }

    setItems((current) => {
      const withoutUpdated = current.filter((item) => item.id !== body.learningItem?.id);
      return [body.learningItem as LearningItem, ...withoutUpdated];
    });
    setEditingId("");
    setForm(blankForm);
    setStatus("saved");
  }

  async function deleteItem(item: LearningItem) {
    setStatus(`deleting:${item.id}`);
    setError("");
    const response = await fetch("/api/learning", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus("");
      setError(body.error ?? "Learning could not be deleted.");
      return;
    }

    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    if (editingId === item.id) startNew();
    setStatus("deleted");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[378px_minmax(0,1fr)]">
      <form onSubmit={submit} className="rounded-[7px] border border-gray-300 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-gray-950">
            {editingId ? "Edit Learning" : "Add Learning"}
          </h2>
          {editingId ? (
            <button type="button" onClick={startNew} className="text-[12px] font-semibold text-blue-700">
              New
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <select
            value={form.sourceProvider}
            onChange={(event) => setForm({ ...form, sourceProvider: event.currentTarget.value as LearningForm["sourceProvider"] })}
            className="h-9 w-full rounded-[5px] border border-gray-300 bg-white px-3 text-[13px] text-gray-950 outline-none focus:border-blue-500"
          >
            <option value="web">Web</option>
            <option value="slack">Slack</option>
            <option value="telegram">Telegram</option>
          </select>
          <select
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.currentTarget.value })}
            className="h-9 w-full rounded-[5px] border border-gray-300 bg-white px-3 text-[13px] capitalize text-gray-950 outline-none focus:border-blue-500"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            value={form.sourceLabel}
            onChange={(event) => setForm({ ...form, sourceLabel: event.currentTarget.value })}
            placeholder="Source label"
            className="h-9 w-full rounded-[5px] border border-gray-300 px-3 text-[13px] text-gray-950 outline-none placeholder:text-gray-400 focus:border-blue-500"
          />
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.currentTarget.value })}
            placeholder="Learning title"
            className="h-9 w-full rounded-[5px] border border-gray-300 px-3 text-[13px] text-gray-950 outline-none placeholder:text-gray-400 focus:border-blue-500"
            required
          />
          <textarea
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.currentTarget.value })}
            placeholder="What should future work remember?"
            className="h-[166px] w-full rounded-[5px] border border-gray-300 px-3 py-3 text-[13px] text-gray-950 outline-none placeholder:text-gray-400 focus:border-blue-500"
          />
        </div>

        {error ? <p className="mt-3 text-[12px] font-medium text-red-600">{error}</p> : null}
        {status === "saved" ? <p className="mt-3 text-[12px] font-medium text-emerald-700">Saved.</p> : null}
        {status === "deleted" ? <p className="mt-3 text-[12px] font-medium text-emerald-700">Deleted.</p> : null}

        <button
          type="submit"
          disabled={status === "saving"}
          className="mt-4 h-9 w-full rounded-[5px] bg-gray-950 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "saving" ? "Saving..." : editingId ? "Save Changes" : "Save Learning"}
        </button>
      </form>

      <section className="rounded-[7px] border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-[15px] font-bold text-gray-950">Saved Learnings</h2>
        <div className="mt-4 space-y-2">
          {sortedItems.length ? (
            sortedItems.map((item) => (
              <article key={item.id} className="rounded-[6px] border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-bold text-gray-950">{item.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      <span>{sourceLabel(item.source_provider)}</span>
                      <span className="capitalize">{item.category}</span>
                      {item.source_label ? <span>{item.source_label}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button type="button" onClick={() => startEdit(item)} className="text-[12px] font-semibold text-blue-700">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item)}
                      disabled={status === `deleting:${item.id}`}
                      className="text-[12px] font-semibold text-red-600 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {item.body ? <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-gray-700">{item.body}</p> : null}
              </article>
            ))
          ) : (
            <div className="grid h-[76px] place-items-center rounded-[6px] border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-[13px] text-gray-500">
              Saved learnings will appear here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
