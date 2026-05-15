"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Schedule = {
  id: string;
  name: string;
  workflow_key: string;
  cadence: string;
  timezone: string;
  enabled: boolean;
};

export function ScheduleManager({
  initialSchedules,
}: {
  initialSchedules: Schedule[];
}) {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [busy, setBusy] = useState(false);

  async function loadSchedules() {
    const response = await fetch("/api/integrations/schedules");
    const body = (await response.json()) as {
      schedules?: Schedule[];
      error?: string;
    };
    if (body.error) {
      setMessageTone("error");
      setMessage(body.error);
    }
    setSchedules(body.schedules ?? []);
  }

  async function createSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/integrations/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        workflowKey: form.get("workflowKey"),
        cadence: form.get("cadence"),
        timezone: form.get("timezone"),
        targetProviders: form.getAll("targetProviders"),
        messageTemplate: form.get("messageTemplate"),
      }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (body.error) {
      setMessageTone("error");
      setMessage(body.error);
      return;
    }
    event.currentTarget.reset();
    setMessageTone("info");
    setMessage("Schedule saved.");
    await loadSchedules();
  }

  async function updateSchedule(id: string, enabled: boolean) {
    setBusy(true);
    const response = await fetch(`/api/integrations/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (body.error) {
      setMessageTone("error");
      setMessage(body.error);
      return;
    }
    await loadSchedules();
  }

  async function runNow(id: string) {
    setBusy(true);
    const response = await fetch(`/api/integrations/schedules/${id}/run`, {
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    setMessageTone(body.error ? "error" : "info");
    setMessage(body.error ?? "Run queued.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader
          eyebrow="New"
          title="Create a schedule"
          description="Automate digests and prompts on a cadence."
        />
        <CardBody>
          <form onSubmit={createSchedule} className="space-y-4">
            <Field label="Name" required>
              <Input name="name" required placeholder="Weekly review" />
            </Field>
            <Field label="Workflow">
              <Select name="workflowKey">
                <option value="weekly_funnel_review">Weekly funnel review</option>
                <option value="daily_notes_digest">Daily notes digest</option>
                <option value="learning_prompt">Learning prompt</option>
              </Select>
            </Field>
            <Field label="Cadence">
              <Select name="cadence">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Timezone">
              <Input name="timezone" defaultValue="America/New_York" />
            </Field>
            <fieldset className="grid gap-2">
              <legend className="text-[13px] font-medium text-[color:var(--color-ink-700)]">
                Targets
              </legend>
              <label className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink-700)]">
                <input
                  type="checkbox"
                  name="targetProviders"
                  value="slack"
                  className="h-4 w-4 rounded border-[color:var(--color-border-strong)] text-[color:var(--color-brand-600)] focus:ring-[color:var(--color-ring)]"
                />
                Slack
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink-700)]">
                <input
                  type="checkbox"
                  name="targetProviders"
                  value="telegram"
                  className="h-4 w-4 rounded border-[color:var(--color-border-strong)] text-[color:var(--color-brand-600)] focus:ring-[color:var(--color-ring)]"
                />
                Telegram
              </label>
            </fieldset>
            <Field label="Message">
              <Textarea name="messageTemplate" rows={4} placeholder="Optional message template" />
            </Field>

            <Button type="submit" loading={busy} fullWidth>
              Save schedule
            </Button>

            {message ? (
              <div
                className={`rounded-lg border px-3.5 py-2.5 text-[13px] ${
                  messageTone === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </div>
            ) : null}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Active"
          title="Schedules"
          description={`${schedules.length} active schedule${schedules.length === 1 ? "" : "s"}.`}
        />
        <CardBody>
          {schedules.length ? (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                        {schedule.name}
                      </p>
                      <Badge tone={schedule.enabled ? "success" : "neutral"}>
                        {schedule.enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[12px] capitalize text-[color:var(--color-ink-500)]">
                      {schedule.cadence} · {schedule.timezone}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => runNow(schedule.id)}
                    >
                      Run now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => updateSchedule(schedule.id, !schedule.enabled)}
                    >
                      {schedule.enabled ? "Pause" : "Enable"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[color:var(--color-ink-500)]">
              No schedules yet.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
