"use client";

import { FormEvent, useState } from "react";

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
  const [busy, setBusy] = useState(false);

  async function loadSchedules() {
    const response = await fetch("/api/integrations/schedules");
    const body = (await response.json()) as { schedules?: Schedule[]; error?: string };
    if (body.error) setMessage(body.error);
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
      setMessage(body.error);
      return;
    }
    event.currentTarget.reset();
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
    setMessage(body.error ?? "Run queued.");
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={createSchedule} className="border border-[#d9d7cb] bg-white p-6">
        <h2 className="text-2xl font-semibold text-[#171717]">New schedule</h2>
        <label className="mt-5 block text-sm font-medium text-[#34342f]">
          Name
          <input name="name" required className="mt-2 w-full border border-[#d9d7cb] px-3 py-2" />
        </label>
        <label className="mt-4 block text-sm font-medium text-[#34342f]">
          Workflow
          <select name="workflowKey" className="mt-2 w-full border border-[#d9d7cb] px-3 py-2">
            <option value="weekly_funnel_review">Weekly funnel review</option>
            <option value="daily_notes_digest">Daily notes digest</option>
            <option value="learning_prompt">Learning prompt</option>
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-[#34342f]">
          Cadence
          <select name="cadence" className="mt-2 w-full border border-[#d9d7cb] px-3 py-2">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-[#34342f]">
          Timezone
          <input
            name="timezone"
            defaultValue="America/New_York"
            className="mt-2 w-full border border-[#d9d7cb] px-3 py-2"
          />
        </label>
        <fieldset className="mt-4 grid gap-2 text-sm text-[#34342f]">
          <legend className="font-medium">Targets</legend>
          <label className="flex gap-2">
            <input type="checkbox" name="targetProviders" value="slack" /> Slack
          </label>
          <label className="flex gap-2">
            <input type="checkbox" name="targetProviders" value="telegram" /> Telegram
          </label>
        </fieldset>
        <label className="mt-4 block text-sm font-medium text-[#34342f]">
          Message
          <textarea
            name="messageTemplate"
            rows={4}
            className="mt-2 w-full border border-[#d9d7cb] px-3 py-2"
          />
        </label>
        <button
          disabled={busy}
          className="mt-5 bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Save schedule
        </button>
        {message ? <p className="mt-4 text-sm text-[#5d5d55]">{message}</p> : null}
      </form>

      <section className="border border-[#d9d7cb] bg-white p-6">
        <h2 className="text-2xl font-semibold text-[#171717]">Schedules</h2>
        <div className="mt-5 grid gap-3">
          {schedules.length ? (
            schedules.map((schedule) => (
              <div key={schedule.id} className="border border-[#ebe3d8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#171717]">{schedule.name}</p>
                    <p className="mt-1 text-sm text-[#5d5d55]">
                      {schedule.cadence} · {schedule.timezone}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runNow(schedule.id)}
                      className="border border-[#0f766e] px-3 py-2 text-sm font-semibold text-[#0f766e]"
                    >
                      Run now
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateSchedule(schedule.id, !schedule.enabled)}
                      className="border border-[#d9d7cb] px-3 py-2 text-sm font-semibold text-[#34342f]"
                    >
                      {schedule.enabled ? "Pause" : "Enable"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#5d5d55]">No schedules yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
