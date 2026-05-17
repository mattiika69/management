"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export type AgentRequestView = {
  id: string;
  request_text: string;
  source_provider: "web" | "slack" | "telegram" | null;
  risk_level: "low" | "normal" | "high";
  status: "pending" | "approved" | "running" | "completed" | "cancelled" | "failed";
  created_at: string;
};

type RequestResponse = {
  request?: AgentRequestView;
  requests?: AgentRequestView[];
  error?: string;
};

type EditState = {
  id: string;
  requestText: string;
  riskLevel: AgentRequestView["risk_level"];
} | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function statusTone(value: string) {
  if (value === "approved" || value === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "failed" || value === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-[#d9e1ee] bg-[#f8fafc] text-[#667085]";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone(value)}`}>
      {value}
    </span>
  );
}

function sourceLabel(value: AgentRequestView["source_provider"]) {
  if (value === "slack") return "Slack";
  if (value === "telegram") return "Telegram";
  return "App";
}

export function AgentRequestWorkspace({
  initialRequests,
}: {
  initialRequests: AgentRequestView[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [requestText, setRequestText] = useState("");
  const [riskLevel, setRiskLevel] = useState<AgentRequestView["risk_level"]>("normal");
  const [edit, setEdit] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshRequests() {
    const response = await fetch("/api/agent/requests");
    const body = (await response.json()) as RequestResponse;
    if (!response.ok || !body.requests) {
      throw new Error(body.error ?? "Requests could not be loaded.");
    }
    setRequests(body.requests);
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/agent/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestText,
        riskLevel,
        sourceProvider: "web",
        metadata: { source: "settings_ai_agent" },
      }),
    });
    const body = (await response.json()) as RequestResponse;
    setSaving(false);

    if (!response.ok || !body.request) {
      setMessage(body.error ?? "Request could not be saved.");
      return;
    }

    setRequests((current) => [body.request as AgentRequestView, ...current]);
    setRequestText("");
    setRiskLevel("normal");
    setMessage("AI Agent request saved.");
  }

  async function updateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/agent/requests/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestText: edit.requestText,
        riskLevel: edit.riskLevel,
      }),
    });
    const body = (await response.json()) as RequestResponse;
    setSaving(false);

    if (!response.ok || !body.request) {
      setMessage(body.error ?? "Request could not be updated.");
      return;
    }

    const updatedRequest = body.request;
    setRequests((current) =>
      current.map((request) => (request.id === updatedRequest.id ? updatedRequest : request)),
    );
    setEdit(null);
    setMessage("AI Agent request updated.");
  }

  async function changeStatus(id: string, action: "approve" | "cancel") {
    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/agent/requests/${id}/${action}`, {
      method: "POST",
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(body.error ?? "Request could not be updated.");
      return;
    }

    await refreshRequests();
    setMessage(action === "approve" ? "AI Agent request approved." : "AI Agent request cancelled.");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <form onSubmit={createRequest} className="settings-card-pad">
        <div className="mb-5">
          <h2 className="text-[15px] font-bold text-[#101828]">Create request</h2>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#667085]">
            Send work to the AI Agent from the app, Slack, or Telegram.
          </p>
        </div>

        <label className="grid gap-2">
          <span className="text-[13px] font-semibold text-[#344054]">Request</span>
          <textarea
            required
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            className="min-h-[148px] w-full rounded-[7px] border border-[#cfd8e6] bg-white px-3 py-3 text-[13px] font-medium text-[#101828] outline-none transition placeholder:text-[#98a2b3] focus:border-[#2563eb] focus:ring-4 focus:ring-blue-600/10"
            placeholder="Describe what the AI Agent should do."
          />
        </label>

        <label className="mt-4 grid gap-2">
          <span className="text-[13px] font-semibold text-[#344054]">Risk</span>
          <select
            value={riskLevel}
            onChange={(event) => setRiskLevel(event.target.value as AgentRequestView["risk_level"])}
            className="settings-field w-full"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>

        <button type="submit" disabled={saving} className="settings-button-dark mt-5 w-full">
          {saving ? "Saving..." : "Create request"}
        </button>

        {message ? (
          <p className="mt-4 text-[12px] font-semibold text-[#667085]" role="status">
            {message}
          </p>
        ) : null}
      </form>

      <section className="settings-card overflow-hidden">
        <div className="settings-card-header flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#101828]">Requests</h2>
            <p className="mt-1 text-[12px] font-medium text-[#667085]">
              Same queue for the app, Slack, and Telegram.
            </p>
          </div>
          <span className="text-[12px] font-bold text-[#667085]">{requests.length}</span>
        </div>

        {requests.length ? (
          <div className="divide-y divide-[#e4e7ec]">
            {requests.map((request) => {
              const canEdit = request.status === "pending" || request.status === "approved";
              const isEditing = edit?.id === request.id;

              return (
                <article key={request.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#667085]">
                        {shortId(request.id)} / {sourceLabel(request.source_provider)} / {formatDate(request.created_at)}
                      </p>
                      <p className="mt-2 text-[13px] font-semibold leading-6 text-[#101828]">
                        {request.request_text}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={request.status} />
                      <span className="rounded-full border border-[#d9e1ee] bg-white px-2.5 py-1 text-[11px] font-bold capitalize text-[#667085]">
                        {request.risk_level}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <form onSubmit={updateRequest} className="mt-4 rounded-[8px] border border-[#d9e1ee] bg-[#f8fafc] p-3">
                      <label className="grid gap-2">
                        <span className="text-[12px] font-bold text-[#344054]">Edit request</span>
                        <textarea
                          required
                          value={edit.requestText}
                          onChange={(event) => setEdit({ ...edit, requestText: event.target.value })}
                          className="min-h-[96px] w-full rounded-[7px] border border-[#cfd8e6] bg-white px-3 py-2 text-[13px] font-medium text-[#101828] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-600/10"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <label className="grid min-w-[140px] gap-2">
                          <span className="text-[12px] font-bold text-[#344054]">Risk</span>
                          <select
                            value={edit.riskLevel}
                            onChange={(event) =>
                              setEdit({
                                ...edit,
                                riskLevel: event.target.value as AgentRequestView["risk_level"],
                              })
                            }
                            className="settings-field h-9 w-full"
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                          </select>
                        </label>
                        <button type="submit" disabled={saving} className="settings-button-dark h-9">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEdit(null)}
                          className="settings-button-outline h-9"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canEdit || saving}
                      onClick={() =>
                        setEdit({
                          id: request.id,
                          requestText: request.request_text,
                          riskLevel: request.risk_level,
                        })
                      }
                      className="settings-button-outline h-9"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={request.status !== "pending" || saving}
                      onClick={() => changeStatus(request.id, "approve")}
                      className="settings-button-dark h-9"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={["completed", "cancelled"].includes(request.status) || saving}
                      onClick={() => changeStatus(request.id, "cancel")}
                      className="settings-button-outline h-9 text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <div className="app-muted-box px-4 py-8 text-center text-[13px] font-medium">
              No AI Agent requests yet.
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
