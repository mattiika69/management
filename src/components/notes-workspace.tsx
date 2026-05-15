"use client";

import { useMemo, useState } from "react";
import type { CompanyContextRow, FunnelRow } from "@/lib/hyperoptimal/server";
import type { WorkspaceNote } from "@/lib/notes/server";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Filter = "all" | "pinned" | "private" | "shared";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function notePreview(body: string) {
  const trimmed = body.trim();
  return trimmed ? trimmed.slice(0, 110) : "No content yet";
}

export function NotesWorkspace({
  initialNotes,
  initialSelectedNoteId,
  contexts = [],
  funnels = [],
}: {
  initialNotes: WorkspaceNote[];
  initialSelectedNoteId?: string;
  contexts?: CompanyContextRow[];
  funnels?: FunnelRow[];
}) {
  const [notes, setNotes] = useState<WorkspaceNote[]>(initialNotes);
  const [selectedId, setSelectedId] = useState(
    initialSelectedNoteId ?? initialNotes[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [contextFilter, setContextFilter] = useState("");
  const [funnelFilter, setFunnelFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const selectedNote = notes.find((note) => note.id === selectedId) ?? notes[0];
  const folders = useMemo(
    () => Array.from(new Set(notes.map((note) => note.folder).filter(Boolean))),
    [notes],
  );
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesQuery =
        !query ||
        note.title.toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesFilter =
        filter === "all" ||
        (filter === "pinned" && note.pinned) ||
        (filter === "private" && note.visibility === "private") ||
        (filter === "shared" && note.visibility === "shared");
      const matchesContext = !contextFilter || note.context_id === contextFilter;
      const matchesFunnel = !funnelFilter || note.funnel_id === funnelFilter;
      const matchesAsset = !assetFilter || note.asset_key === assetFilter;
      const matchesCategory =
        !categoryFilter || note.inspiration_category === categoryFilter;
      return (
        matchesQuery &&
        matchesFilter &&
        matchesContext &&
        matchesFunnel &&
        matchesAsset &&
        matchesCategory
      );
    });
  }, [
    assetFilter,
    categoryFilter,
    contextFilter,
    filter,
    funnelFilter,
    notes,
    search,
  ]);
  const assetOptions = useMemo(
    () =>
      Array.from(
        new Set(notes.map((note) => note.asset_key).filter(Boolean)),
      ) as string[],
    [notes],
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(notes.map((note) => note.inspiration_category).filter(Boolean)),
      ) as string[],
    [notes],
  );

  function patchSelected(patch: Partial<WorkspaceNote>) {
    if (!selectedNote) return;
    setNotes((current) =>
      current.map((note) =>
        note.id === selectedNote.id ? { ...note, ...patch } : note,
      ),
    );
    setDirty((current) => ({ ...current, [selectedNote.id]: true }));
  }

  async function createNote() {
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Untitled",
        body: "",
        folder: "Funnel",
        source: "Manual",
        tags: [],
        visibility: "private",
        pinned: false,
      }),
    });
    const body = (await response.json()) as {
      error?: string;
      note?: WorkspaceNote;
    };

    if (!response.ok || !body.note) {
      setStatus("error");
      setMessage(body.error ?? "Note did not save.");
      return;
    }

    setNotes((current) => [body.note as WorkspaceNote, ...current]);
    setSelectedId(body.note.id);
    setStatus("saved");
    setMessage("Note created.");
  }

  async function saveNote() {
    if (!selectedNote) return;
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedNote),
    });
    const body = (await response.json()) as {
      error?: string;
      note?: WorkspaceNote;
    };

    if (!response.ok || !body.note) {
      setStatus("error");
      setMessage(body.error ?? "Note did not save.");
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === body.note?.id ? (body.note as WorkspaceNote) : note,
      ),
    );
    setDirty((current) => ({ ...current, [body.note!.id]: false }));
    setStatus("saved");
    setMessage("Note saved.");
  }

  async function deleteNote() {
    if (!selectedNote) return;
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedNote.id }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Note was not deleted.");
      return;
    }

    const remaining = notes.filter((note) => note.id !== selectedNote.id);
    setNotes(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    setStatus("saved");
    setMessage("Note deleted.");
  }

  async function copyLink() {
    if (!selectedNote) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/notes?note=${selectedNote.id}`,
    );
    setMessage("Link copied.");
  }

  const filterPills: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: notes.length },
    {
      id: "pinned",
      label: "Pinned",
      count: notes.filter((note) => note.pinned).length,
    },
    {
      id: "private",
      label: "Private",
      count: notes.filter((note) => note.visibility === "private").length,
    },
    {
      id: "shared",
      label: "Shared",
      count: notes.filter((note) => note.visibility === "shared").length,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)] lg:h-[720px]">
      <div className="grid h-full lg:grid-cols-[220px_320px_minmax(0,1fr)]">
        <aside className="border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-400)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search notes…"
              className="h-9 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-9 pr-3 text-[13px] outline-none placeholder:text-[color:var(--color-ink-300)] focus:border-[color:var(--color-brand-500)] focus:ring-4 focus:ring-[color:var(--color-ring)]"
            />
          </div>

          <div className="mt-4">
            <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
              Views
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5">
              {filterPills.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter(pill.id)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    filter === pill.id
                      ? "bg-[color:var(--color-surface)] text-[color:var(--color-ink-900)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[color:var(--color-border)]"
                      : "text-[color:var(--color-ink-500)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink-900)]"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className="text-[11px] text-[color:var(--color-ink-400)]">
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {folders.length ? (
            <div className="mt-5">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
                Folders
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {folders.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => setSearch(folder)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-[color:var(--color-ink-500)] transition-colors hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink-900)]"
                  >
                    <svg className="h-3.5 w-3.5 text-[color:var(--color-ink-400)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    {folder}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <aside className="flex flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
          <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                {filter === "all"
                  ? "All notes"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </h2>
              <p className="text-[11px] text-[color:var(--color-ink-400)]">
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "note" : "notes"}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={createNote}
              leftIcon={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              New
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-b border-[color:var(--color-border)] p-3">
            <Select
              value={contextFilter}
              onChange={(event) => setContextFilter(event.currentTarget.value)}
              className="h-8 text-[11px]"
            >
              <option value="">All contexts</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.title}
                </option>
              ))}
            </Select>
            <Select
              value={funnelFilter}
              onChange={(event) => setFunnelFilter(event.currentTarget.value)}
              className="h-8 text-[11px]"
            >
              <option value="">All funnels</option>
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </Select>
            <Select
              value={assetFilter}
              onChange={(event) => setAssetFilter(event.currentTarget.value)}
              className="h-8 text-[11px]"
            >
              <option value="">All assets</option>
              {assetOptions.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </Select>
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.currentTarget.value)}
              className="h-8 text-[11px]"
            >
              <option value="">All inspiration</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredNotes.length ? (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={`block w-full border-b border-[color:var(--color-border)] px-4 py-3 text-left transition-colors ${
                    selectedNote?.id === note.id
                      ? "bg-[color:var(--color-surface)]"
                      : "hover:bg-[color:var(--color-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                      {note.title}
                    </span>
                    {note.pinned ? (
                      <svg className="h-3 w-3 shrink-0 text-[color:var(--color-brand-600)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" />
                      </svg>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[color:var(--color-ink-500)]">
                    {notePreview(note.body)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="brand">{note.source}</Badge>
                    {note.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                    {note.asset_key ? (
                      <Badge tone="success">{note.asset_key}</Badge>
                    ) : null}
                    <span className="ml-auto text-[11px] text-[color:var(--color-ink-400)]">
                      {formatDate(note.updated_at)}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-400)]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-[color:var(--color-ink-700)]">
                  No notes found
                </p>
                <p className="mt-1 text-[12px] text-[color:var(--color-ink-400)]">
                  Adjust filters or create a new note.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-[600px] flex-col bg-[color:var(--color-surface)]">
          {selectedNote ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border)] px-5 py-3">
                <Select
                  value={selectedNote.source}
                  onChange={(event) =>
                    patchSelected({ source: event.currentTarget.value })
                  }
                  className="h-8 w-auto text-[12px]"
                >
                  <option>Manual</option>
                  <option>Telegram</option>
                  <option>Slack</option>
                  <option>AI Output</option>
                </Select>
                <Input
                  value={selectedNote.tags.join(", ")}
                  onChange={(event) =>
                    patchSelected({
                      tags: event.currentTarget.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Tags"
                  className="h-8 w-44 text-[12px]"
                />
                <Input
                  value={selectedNote.folder}
                  onChange={(event) =>
                    patchSelected({ folder: event.currentTarget.value })
                  }
                  placeholder="Folder"
                  className="h-8 w-36 text-[12px]"
                />
                <Select
                  value={selectedNote.visibility}
                  onChange={(event) =>
                    patchSelected({
                      visibility: event.currentTarget
                        .value as WorkspaceNote["visibility"],
                    })
                  }
                  className="h-8 w-auto text-[12px]"
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                </Select>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patchSelected({ pinned: !selectedNote.pinned })}
                  >
                    {selectedNote.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyLink}>
                    Copy link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deleteNote} className="text-[color:var(--color-danger)] hover:bg-red-50">
                    Delete
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveNote}
                    disabled={status === "saving" || !dirty[selectedNote.id]}
                  >
                    {status === "saving"
                      ? "Saving…"
                      : dirty[selectedNote.id]
                        ? "Save"
                        : "Saved"}
                  </Button>
                </div>
              </div>

              {message ? (
                <div
                  className={`border-b px-5 py-2.5 text-[13px] ${
                    status === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"
                  }`}
                  role="status"
                >
                  {message}
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto px-10 py-10">
                <div className="mx-auto max-w-3xl">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
                    Last updated {formatDate(selectedNote.updated_at)}
                  </p>
                  <input
                    value={selectedNote.title}
                    onChange={(event) =>
                      patchSelected({ title: event.currentTarget.value })
                    }
                    className="mt-3 w-full border-0 bg-transparent text-[32px] font-semibold leading-tight tracking-tight text-[color:var(--color-ink-900)] outline-none placeholder:text-[color:var(--color-ink-300)]"
                    placeholder="Untitled"
                  />
                  <Textarea
                    value={selectedNote.body}
                    onChange={(event) =>
                      patchSelected({ body: event.currentTarget.value })
                    }
                    className="mt-5 min-h-[420px] resize-none border-0 bg-transparent px-0 text-[15px] leading-7 text-[color:var(--color-ink-700)] shadow-none focus:ring-0"
                    placeholder="Start writing…"
                    style={{ boxShadow: "none" }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-400)]">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="text-[15px] font-semibold text-[color:var(--color-ink-900)]">
                Start your first note
              </h3>
              <p className="mt-1 max-w-sm text-[13px] text-[color:var(--color-ink-500)]">
                Capture ideas, decisions, and follow-ups across funnels in one place.
              </p>
              <Button variant="primary" size="md" onClick={createNote} className="mt-5">
                Create note
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
