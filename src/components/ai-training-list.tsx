"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AIDefinitionRow, TrainingRow } from "@/lib/hyperoptimal/server";

type Status = Record<string, "idle" | "saving" | "saved" | "error">;

export function AITrainingList({
  definitions,
  trainingRows,
}: {
  definitions: AIDefinitionRow[];
  trainingRows: TrainingRow[];
}) {
  const [status, setStatus] = useState<Status>({});
  const [message, setMessage] = useState("");
  const rowsByAgent = useMemo(
    () => new Map(trainingRows.map((row) => [row.agent_id, row])),
    [trainingRows],
  );

  async function saveTraining(event: FormEvent<HTMLFormElement>, agentId: string) {
    event.preventDefault();
    setStatus((current) => ({ ...current, [agentId]: "saving" }));
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/ai/training", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        overallDescription: formData.get("overallDescription"),
        framework: formData.get("framework"),
        criteria: formData.get("criteria"),
        aiSequence: formData.get("aiSequence"),
        trainingRefs: String(formData.get("trainingRefs") ?? "")
          .split("\n")
          .map((url) => ({ url: url.trim() }))
          .filter((row) => row.url),
      }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus((current) => ({ ...current, [agentId]: "error" }));
      setMessage(body.error ?? "Training did not save.");
      return;
    }

    setStatus((current) => ({ ...current, [agentId]: "saved" }));
    setMessage("Training saved.");
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-lg border border-[#b7d7cf] bg-[#eef7f5] px-4 py-3 text-sm text-[#0f766e]" role="status">
          {message}
        </p>
      ) : null}

      {definitions.map((definition) => {
        const row = rowsByAgent.get(definition.agent_id);
        const criteria = row?.criteria || definition.default_criteria.map((item) => `- ${item}`).join("\n");
        return (
          <form
            key={definition.agent_id}
            onSubmit={(event) => saveTraining(event, definition.agent_id)}
            className="rounded-lg border border-[#e8ded2] bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="mt-1 font-serif text-2xl font-bold text-[#2d2620]">
                  {definition.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8a7f73]">
                  {definition.description}
                </p>
              </div>
              <button
                type="submit"
                disabled={status[definition.agent_id] === "saving"}
                className="rounded-md bg-[#e85b3c] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status[definition.agent_id] === "saving" ? "Saving..." : "Save training"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Overall description
                </span>
                <textarea
                  name="overallDescription"
                  defaultValue={row?.overall_description ?? ""}
                  rows={5}
                  className="w-full resize-y rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm leading-6 outline-none focus:border-[#e85b3c]"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Framework
                </span>
                <textarea
                  name="framework"
                  defaultValue={row?.framework ?? ""}
                  rows={5}
                  className="w-full resize-y rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm leading-6 outline-none focus:border-[#e85b3c]"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Criteria
                </span>
                <textarea
                  name="criteria"
                  defaultValue={criteria}
                  rows={7}
                  className="w-full resize-y rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm leading-6 outline-none focus:border-[#e85b3c]"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-[#4b4038]">
                  AI sequence
                </span>
                <textarea
                  name="aiSequence"
                  defaultValue={row?.ai_sequence || definition.default_prompt}
                  rows={7}
                  className="w-full resize-y rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm leading-6 outline-none focus:border-[#e85b3c]"
                />
              </label>
              <label className="lg:col-span-2">
                <span className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Training reference URLs, one per line
                </span>
                <textarea
                  name="trainingRefs"
                  defaultValue={(row?.training_refs ?? []).map((ref) => ref.url ?? "").filter(Boolean).join("\n")}
                  rows={3}
                  className="w-full resize-y rounded-md border border-[#d9d0c3] bg-[#fffdf8] px-3 py-2 text-sm leading-6 outline-none focus:border-[#e85b3c]"
                />
              </label>
            </div>
          </form>
        );
      })}
    </div>
  );
}
