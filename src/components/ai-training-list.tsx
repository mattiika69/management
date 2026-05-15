"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AIDefinitionRow, TrainingRow } from "@/lib/hyperoptimal/server";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";

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
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
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
      setMessageTone("error");
      setMessage(body.error ?? "Training did not save.");
      return;
    }

    setStatus((current) => ({ ...current, [agentId]: "saved" }));
    setMessageTone("info");
    setMessage("Training saved.");
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

      {definitions.map((definition) => {
        const row = rowsByAgent.get(definition.agent_id);
        const criteria =
          row?.criteria ||
          definition.default_criteria.map((item) => `- ${item}`).join("\n");
        return (
          <form
            key={definition.agent_id}
            onSubmit={(event) => saveTraining(event, definition.agent_id)}
            className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-border)] pb-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
                  AI agent
                </div>
                <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                  {definition.title}
                </h2>
                <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[color:var(--color-ink-500)]">
                  {definition.description}
                </p>
              </div>
              <Button type="submit" loading={status[definition.agent_id] === "saving"}>
                {status[definition.agent_id] === "saving" ? "Saving" : "Save training"}
              </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field label="Overall description">
                <Textarea
                  name="overallDescription"
                  defaultValue={row?.overall_description ?? ""}
                  rows={5}
                />
              </Field>
              <Field label="Framework">
                <Textarea name="framework" defaultValue={row?.framework ?? ""} rows={5} />
              </Field>
              <Field label="Criteria">
                <Textarea name="criteria" defaultValue={criteria} rows={7} />
              </Field>
              <Field label="AI sequence">
                <Textarea
                  name="aiSequence"
                  defaultValue={row?.ai_sequence || definition.default_prompt}
                  rows={7}
                />
              </Field>
              <Field
                label="Training references"
                hint="One URL per line."
                className="lg:col-span-2"
              >
                <Textarea
                  name="trainingRefs"
                  defaultValue={(row?.training_refs ?? [])
                    .map((ref) => ref.url ?? "")
                    .filter(Boolean)
                    .join("\n")}
                  rows={3}
                />
              </Field>
            </div>
          </form>
        );
      })}
    </div>
  );
}
