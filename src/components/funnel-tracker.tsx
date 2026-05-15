"use client";

import { useMemo, useState } from "react";
import { FUNNEL_DEFINITIONS, FunnelType } from "@/lib/hyperoptimal/data";
import type { FunnelRow, FunnelStepRow } from "@/lib/hyperoptimal/server";

type SaveState = Record<string, "idle" | "saving" | "saved" | "error">;

type EditableStep = FunnelStepRow & {
  metadata: NonNullable<FunnelStepRow["metadata"]>;
};

type FlowNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  tone: "green" | "yellow" | "red" | "blue" | "purple" | "orange";
  width?: number;
  height?: number;
};

type FlowLine = {
  from: string;
  to: string;
  dashed?: boolean;
};

const toneClasses = {
  green: { fill: "#f3fff7", stroke: "#138b44", text: "#073f23" },
  yellow: { fill: "#fff7c7", stroke: "#e2b714", text: "#5f4800" },
  red: { fill: "#ffe3e7", stroke: "#dc2626", text: "#7f1d1d" },
  blue: { fill: "#eef5ff", stroke: "#2563eb", text: "#1e3a8a" },
  purple: { fill: "#f3edff", stroke: "#7c3aed", text: "#4c1d95" },
  orange: { fill: "#fff1df", stroke: "#f97316", text: "#7c2d12" },
};

const fallbackTechStack: Record<string, string> = {
  opt_in_page: "Lovable",
  lead_magnet: "Gamma Doc",
  page_with_vsl: "Lovable",
  vsl: "Wistia",
  application_form: "TypeForm",
  unqualified_page: "Lovable",
  thank_you_page: "Lovable",
  book_a_call: "Scheduler",
  welcome_flow: "Kit",
  pre_call_flow: "Kit",
  selfie_video: "Video",
  retargeting_ads: "Meta",
  appointment_setting_message: "Platform name",
  breakout_videos: "Video",
  sales_call_plan: "Call notes",
  follow_up_flow: "Kit",
  webinar_opt_in_page: "Lovable",
  webinar_confirmation_page: "Lovable",
  webinar_pre_email_flow: "Kit",
  webinar_pre_sms_flow: "Roezan",
  webinar_platform: "Webinar platform",
  webinar_presentation: "Slides",
  webinar_replay_page: "Lovable",
  webinar_post_flow: "Kit",
  webinar_meeting_scheduler: "Scheduler",
};

function normalizeSteps(steps: FunnelStepRow[]): EditableStep[] {
  return steps.map((step) => ({
    ...step,
    metadata: {
      techStackName: step.metadata?.techStackName || fallbackTechStack[step.step_key] || "",
      techStackUrl: step.metadata?.techStackUrl || "",
      exampleUrl: step.metadata?.exampleUrl || "",
    },
  }));
}

function nodeCenter(node: FlowNode) {
  return {
    x: node.x + (node.width ?? 62) / 2,
    y: node.y + (node.height ?? 42) / 2,
  };
}

function wrapLabel(label: string) {
  if (label.includes("\n")) return label.split("\n");
  const words = label.split(" ");
  if (words.length <= 2) return [label];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function FlowDiagram({ funnelType }: { funnelType: FunnelType }) {
  const isBookACall = funnelType === "book-a-call";
  const nodes: FlowNode[] = isBookACall
    ? [
        { id: "ad", label: "Ad", x: 30, y: 75, tone: "green" },
        { id: "content", label: "Content", x: 30, y: 130, tone: "green" },
        { id: "optin", label: "Opt In Page", x: 120, y: 103, tone: "green" },
        { id: "vslpage", label: "Page With\nVSL", x: 220, y: 82, tone: "yellow" },
        { id: "apply", label: "Apply\nButton", x: 320, y: 82, tone: "green" },
        { id: "form", label: "Application\nForm", x: 420, y: 82, tone: "red" },
        { id: "unqualified", label: "Un-\nQualified", x: 520, y: 45, tone: "red" },
        { id: "downsell", label: "Downsell If\nPossible?", x: 620, y: 45, tone: "red" },
        { id: "qualified", label: "Qualified", x: 520, y: 122, tone: "blue" },
        { id: "call", label: "Book A Call", x: 620, y: 122, tone: "blue" },
        { id: "thankyou", label: "Thank You\nPage", x: 725, y: 122, tone: "blue" },
        { id: "salesplan", label: "Sales Call\nPlan", x: 830, y: 62, tone: "blue" },
        { id: "sales", label: "Sales Call", x: 830, y: 122, tone: "blue" },
        { id: "close", label: "Close", x: 1010, y: 122, tone: "blue" },
        { id: "upsell", label: "Upsell", x: 1120, y: 122, tone: "blue" },
        { id: "leadmagnet", label: "Lead\nMagnet", x: 320, y: 175, tone: "green" },
        { id: "welcome", label: "Welcome\nFlow", x: 420, y: 175, tone: "green" },
        { id: "precall", label: "Pre-Call\nFlow", x: 725, y: 190, tone: "green" },
        { id: "selfie", label: "Selfie Video", x: 725, y: 250, tone: "orange" },
        { id: "retarget", label: "Retargeting\nAds", x: 725, y: 310, tone: "purple" },
        { id: "followcall", label: "Follow Up\nCall", x: 920, y: 185, tone: "blue" },
        { id: "followflow", label: "Follow Up\nFlow", x: 920, y: 245, tone: "green" },
        { id: "cold", label: "Cold\nOutreach", x: 30, y: 220, tone: "green" },
        { id: "partners", label: "Partnerships", x: 30, y: 285, tone: "green" },
      ]
    : [
        { id: "ad", label: "Ad", x: 50, y: 90, tone: "green" },
        { id: "content", label: "Content", x: 50, y: 150, tone: "green" },
        { id: "optin", label: "Opt In Page", x: 165, y: 120, tone: "green" },
        { id: "confirm", label: "Confirmation\nPage", x: 300, y: 120, tone: "yellow" },
        { id: "pre", label: "Pre-Webinar\nFlow", x: 455, y: 120, tone: "green" },
        { id: "platform", label: "Webinar\nPlatform", x: 620, y: 120, tone: "blue" },
        { id: "replay", label: "Replay\nPage", x: 775, y: 80, tone: "blue" },
        { id: "post", label: "Post-Webinar\nFlow", x: 775, y: 165, tone: "green" },
        { id: "scheduler", label: "Meeting\nScheduler", x: 940, y: 165, tone: "blue" },
        { id: "call", label: "Sales Call", x: 1080, y: 165, tone: "blue" },
      ];

  const lines: FlowLine[] = isBookACall
    ? [
        { from: "ad", to: "optin" },
        { from: "content", to: "optin" },
        { from: "optin", to: "vslpage" },
        { from: "vslpage", to: "apply" },
        { from: "apply", to: "form" },
        { from: "form", to: "unqualified" },
        { from: "unqualified", to: "downsell" },
        { from: "form", to: "qualified" },
        { from: "qualified", to: "call" },
        { from: "call", to: "thankyou" },
        { from: "thankyou", to: "salesplan" },
        { from: "salesplan", to: "sales" },
        { from: "sales", to: "close", dashed: true },
        { from: "close", to: "upsell", dashed: true },
        { from: "optin", to: "leadmagnet", dashed: true },
        { from: "leadmagnet", to: "welcome" },
        { from: "welcome", to: "qualified" },
        { from: "call", to: "precall" },
        { from: "call", to: "selfie" },
        { from: "call", to: "retarget" },
        { from: "sales", to: "followcall", dashed: true },
        { from: "sales", to: "followflow", dashed: true },
        { from: "cold", to: "qualified" },
        { from: "partners", to: "qualified" },
      ]
    : [
        { from: "ad", to: "optin" },
        { from: "content", to: "optin" },
        { from: "optin", to: "confirm" },
        { from: "confirm", to: "pre" },
        { from: "pre", to: "platform" },
        { from: "platform", to: "replay" },
        { from: "platform", to: "post" },
        { from: "replay", to: "post", dashed: true },
        { from: "post", to: "scheduler" },
        { from: "scheduler", to: "call" },
      ];

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <div className="overflow-x-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3">
      <svg viewBox="0 0 1210 410" className="h-[410px] min-w-[1040px]">
        <defs>
          <marker id="flowArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 z" fill="#4b5563" />
          </marker>
        </defs>
        {lines.map((line) => {
          const from = nodeMap.get(line.from);
          const to = nodeMap.get(line.to);
          if (!from || !to) return null;
          const fromCenter = nodeCenter(from);
          const toCenter = nodeCenter(to);
          return (
            <line
              key={`${line.from}-${line.to}`}
              x1={fromCenter.x}
              y1={fromCenter.y}
              x2={toCenter.x}
              y2={toCenter.y}
              stroke="#4b5563"
              strokeWidth="2"
              strokeDasharray={line.dashed ? "8 8" : undefined}
              markerEnd="url(#flowArrow)"
            />
          );
        })}
        {nodes.map((node) => {
          const tone = toneClasses[node.tone];
          const width = node.width ?? 66;
          const height = node.height ?? 44;
          const lines = wrapLabel(node.label);
          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={width}
                height={height}
                rx="8"
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth="2"
              />
              <text
                x={node.x + width / 2}
                y={node.y + height / 2 - (lines.length - 1) * 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={tone.text}
              >
                {lines.map((line, index) => (
                  <tspan key={line} x={node.x + width / 2} dy={index === 0 ? 0 : 13}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function FunnelTracker({
  funnelType,
  funnel,
  steps,
}: {
  funnelType: FunnelType;
  funnel: FunnelRow;
  steps: FunnelStepRow[];
}) {
  const [rows, setRows] = useState<EditableStep[]>(() => normalizeSteps(steps));
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<SaveState>({});
  const [message, setMessage] = useState("");
  const completeCount = rows.filter((step) => step.status === "done").length;
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const dirtyCount = Object.values(dirtyRows).filter(Boolean).length;
  const directDriOptions = useMemo(() => {
    const assigned = rows.map((row) => row.assigned_to).filter(Boolean);
    return Array.from(new Set(["Matthew Larsen", ...assigned]));
  }, [rows]);

  function updateRow(stepId: string, patch: Partial<EditableStep>) {
    setRows((current) =>
      current.map((row) => (row.id === stepId ? { ...row, ...patch } : row)),
    );
    setDirtyRows((current) => ({ ...current, [stepId]: true }));
  }

  function updateMetadata(
    stepId: string,
    key: keyof EditableStep["metadata"],
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === stepId
          ? { ...row, metadata: { ...row.metadata, [key]: value } }
          : row,
      ),
    );
    setDirtyRows((current) => ({ ...current, [stepId]: true }));
  }

  async function saveRow(step: EditableStep, showMessage = true) {
    setSaveState((current) => ({ ...current, [step.id]: "saving" }));
    if (showMessage) setMessage("");

    const response = await fetch(`/api/funnels/${funnel.id}/steps`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId: step.id,
        status: step.status,
        url: step.url,
        assignedTo: step.assigned_to,
        techStackName: step.metadata.techStackName,
        techStackUrl: step.metadata.techStackUrl,
        exampleUrl: step.metadata.exampleUrl,
      }),
    });
    const body = (await response.json()) as { error?: string; step?: EditableStep };

    if (!response.ok) {
      setSaveState((current) => ({ ...current, [step.id]: "error" }));
      if (showMessage) setMessage(body.error ?? "Step did not save.");
      return false;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === step.id ? normalizeSteps([body.step ?? step])[0] : row,
      ),
    );
    setDirtyRows((current) => ({ ...current, [step.id]: false }));
    setSaveState((current) => ({ ...current, [step.id]: "saved" }));
    if (showMessage) setMessage("Changes saved.");
    return true;
  }

  async function saveAll() {
    const changed = rows.filter((row) => dirtyRows[row.id]);
    if (!changed.length) return;
    setMessage("");
    const results = await Promise.all(changed.map((row) => saveRow(row, false)));
    setMessage(results.every(Boolean) ? "Changes saved." : "Some changes did not save.");
  }

  async function runAI(step: EditableStep) {
    if (!step.ai_agent_id) return;
    setSaveState((current) => ({ ...current, [step.id]: "saving" }));
    setMessage("");

    const response = await fetch("/api/ai/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        funnelType,
        funnelId: funnel.id,
        stepId: step.id,
        agentId: step.ai_agent_id,
      }),
    });
    const body = (await response.json()) as { error?: string; noteId?: string };

    if (!response.ok) {
      setSaveState((current) => ({ ...current, [step.id]: "error" }));
      setMessage(body.error ?? "AI output was not saved.");
      return;
    }

    setSaveState((current) => ({ ...current, [step.id]: "saved" }));
    setMessage(body.noteId ? `AI output saved to Notes: /notes?note=${body.noteId}` : "AI output saved.");
  }

  async function copyPrompt() {
    const prompt = [
      definition.name,
      definition.subtitle,
      "",
      ...rows.map((row) => {
        const techStack = row.metadata.techStackName
          ? `, tech stack: ${row.metadata.techStackName}`
          : "";
        return `${row.step_order}. ${row.title} - ${row.status}${techStack}`;
      }),
    ].join("\n");

    await navigator.clipboard.writeText(prompt);
    setMessage("Prompt copied.");
  }

  const progress = rows.length ? (completeCount / rows.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-6 py-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-[260px] flex-1 items-center gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
                Funnel progress
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[22px] font-semibold tabular-nums tracking-tight text-[color:var(--color-ink-900)]">
                  {completeCount}
                </span>
                <span className="text-[14px] text-[color:var(--color-ink-400)]">
                  / {rows.length} steps complete
                </span>
              </div>
            </div>
            <div className="ml-2 flex flex-1 flex-col gap-1 min-w-[180px] max-w-xs">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]">
                <div
                  className="h-full rounded-full bg-[color:var(--color-brand-500)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right text-[11px] font-medium tabular-nums text-[color:var(--color-ink-400)]">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAll}
              disabled={!dirtyCount}
              className="inline-flex h-9 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-[13px] font-medium text-[color:var(--color-ink-900)] transition-colors hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dirtyCount ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` : "All saved"}
            </button>
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--color-ink-900)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--color-ink-700)]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy prompt
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700" role="status">
          {message}
        </div>
      ) : null}

      <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
              Flow diagram
            </div>
            <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
              {funnel.name}
            </h2>
            <p className="mt-1 text-[13px] text-[color:var(--color-ink-500)]">{definition.subtitle}</p>
          </div>
        </div>
        <FlowDiagram funnelType={funnelType} />
      </section>

      <section className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="border-b border-[color:var(--color-border)] px-6 py-4">
          <h2 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
            Step checklist
          </h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">
            Manage every funnel step, owner, tech stack, and AI agent in one table.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-ink-500)]">
                <th className="w-14 px-4 py-3 font-semibold">Done</th>
                <th className="w-[220px] px-4 py-3 font-semibold">Step</th>
                <th className="w-[230px] px-4 py-3 font-semibold">URL</th>
                <th className="w-[200px] px-4 py-3 font-semibold">Tech stack</th>
                <th className="w-[220px] px-4 py-3 font-semibold">Stack URL</th>
                <th className="w-[160px] px-4 py-3 font-semibold">Example</th>
                <th className="w-[200px] px-4 py-3 font-semibold">Owner</th>
                <th className="w-[140px] px-4 py-3 font-semibold">AI agent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((step) => (
                <tr
                  key={step.id}
                  className="border-b border-[color:var(--color-border)] transition-colors last:border-b-0 hover:bg-[color:var(--color-surface-muted)]/40"
                >
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={step.status === "done"}
                      onChange={(event) =>
                        updateRow(step.id, {
                          status: event.currentTarget.checked ? "done" : "not_started",
                        })
                      }
                      className="h-4 w-4 rounded border-[color:var(--color-border-strong)] text-[color:var(--color-brand-600)] focus:ring-[color:var(--color-ring)]"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-[color:var(--color-ink-900)]">{step.title}</p>
                    {step.metadata.generatedNoteUrl ? (
                      <a
                        href={step.metadata.generatedNoteUrl}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-brand-600)] hover:underline"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Generated note
                      </a>
                    ) : null}
                    {saveState[step.id] === "saving" || saveState[step.id] === "saved" ? (
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-ink-400)]">
                        {saveState[step.id] === "saving" ? "Saving…" : "Saved"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <input
                        value={step.url}
                        onChange={(event) => updateRow(step.id, { url: event.currentTarget.value })}
                        placeholder="https://…"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-[13px] outline-none placeholder:text-[color:var(--color-ink-300)] focus:border-[color:var(--color-brand-500)] focus:ring-4 focus:ring-[color:var(--color-ring)]"
                      />
                      {step.url ? (
                        <a
                          href={step.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 text-[11px] font-semibold text-[color:var(--color-ink-700)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      value={step.metadata.techStackName ?? ""}
                      onChange={(event) => updateMetadata(step.id, "techStackName", event.currentTarget.value)}
                      placeholder="Platform name…"
                      className="h-9 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-[13px] outline-none focus:border-[color:var(--color-brand-500)] focus:ring-4 focus:ring-[color:var(--color-ring)]"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      value={step.metadata.techStackUrl ?? ""}
                      onChange={(event) => updateMetadata(step.id, "techStackUrl", event.currentTarget.value)}
                      placeholder="https://…"
                      className="h-9 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-[13px] outline-none focus:border-[color:var(--color-brand-500)] focus:ring-4 focus:ring-[color:var(--color-ring)]"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      value={step.metadata.exampleUrl ?? ""}
                      onChange={(event) => updateMetadata(step.id, "exampleUrl", event.currentTarget.value)}
                      placeholder="Example URL"
                      className="h-9 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 text-[13px] outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      value={step.assigned_to || ""}
                      onChange={(event) => updateRow(step.id, { assigned_to: event.currentTarget.value })}
                      className="h-9 w-full appearance-none rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 pr-8 text-[13px] outline-none focus:border-[color:var(--color-brand-500)] focus:ring-4 focus:ring-[color:var(--color-ring)]"
                      style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'><path d='M3 4.5L6 7.5L9 4.5' stroke='%235f5f5a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.6rem center" }}
                    >
                      <option value="">Assign owner</option>
                      {directDriOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {step.ai_agent_id ? (
                      <button
                        type="button"
                        onClick={() => runAI(step)}
                        disabled={saveState[step.id] === "saving"}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] px-3 text-[12px] font-semibold text-[color:var(--color-brand-700)] transition-colors hover:bg-[color:var(--color-brand-100)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Launch
                      </button>
                    ) : (
                      <span className="text-[11px] text-[color:var(--color-ink-400)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
