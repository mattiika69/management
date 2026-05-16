"use client";

import { useMemo, useState } from "react";
import type { CompanyContextRow, FunnelRow } from "@/lib/hyperoptimal/server";
import type { WorkspaceNote } from "@/lib/notes/server";

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
  return trimmed ? trimmed.slice(0, 96) : "No content yet";
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
  const [selectedId, setSelectedId] = useState(initialSelectedNoteId ?? initialNotes[0]?.id ?? "");
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
      const matchesCategory = !categoryFilter || note.inspiration_category === categoryFilter;
      return matchesQuery && matchesFilter && matchesContext && matchesFunnel && matchesAsset && matchesCategory;
    });
  }, [assetFilter, categoryFilter, contextFilter, filter, funnelFilter, notes, search]);
  const assetOptions = useMemo(
    () => Array.from(new Set(notes.map((note) => note.asset_key).filter(Boolean))) as string[],
    [notes],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(notes.map((note) => note.inspiration_category).filter(Boolean))) as string[],
    [notes],
  );

  function patchSelected(patch: Partial<WorkspaceNote>) {
    if (!selectedNote) return;
    setNotes((current) =>
      current.map((note) => (note.id === selectedNote.id ? { ...note, ...patch } : note)),
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
        folder: "Workspace",
        source: "Manual",
        tags: [],
        visibility: "private",
        pinned: false,
      }),
    });
    const body = (await response.json()) as { error?: string; note?: WorkspaceNote };

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
    const body = (await response.json()) as { error?: string; note?: WorkspaceNote };

    if (!response.ok || !body.note) {
      setStatus("error");
      setMessage(body.error ?? "Note did not save.");
      return;
    }

    setNotes((current) =>
      current.map((note) => (note.id === body.note?.id ? (body.note as WorkspaceNote) : note)),
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
    await navigator.clipboard.writeText(`${window.location.origin}/notes?note=${selectedNote.id}`);
    setMessage("Link copied.");
  }

  return (
    <section className="overflow-hidden border border-[#d8dee9] bg-white shadow-sm lg:h-[700px]">
      <div className="grid h-full lg:grid-cols-[190px_290px_minmax(0,1fr)]">
        <aside className="bg-[#111a2d] p-3 text-[#c4cedd]">
          <input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search"
            className="h-9 w-full rounded-md border border-[#31415e] bg-[#1d2a3d] px-3 text-sm text-white outline-none placeholder:text-[#6f7d92] focus:border-[#4f8cff]"
          />

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded px-3 py-2 ${filter === "all" ? "bg-[#34445d] text-white" : "text-[#9aa7bb]"}`}
            >
              My Notes
            </button>
            <button
              type="button"
              onClick={() => setFilter("shared")}
              className={`rounded px-3 py-2 ${filter === "shared" ? "bg-[#34445d] text-white" : "text-[#9aa7bb]"}`}
            >
              Shared
            </button>
          </div>

          <div className="mt-3 space-y-1 border-b border-[#2e3d55] pb-3 text-sm">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex w-full items-center justify-between rounded px-2 py-2 ${filter === "all" ? "bg-[#34445d] text-white" : "text-[#9aa7bb]"}`}
            >
              <span>All Notes</span>
              <span>{notes.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("pinned")}
              className={`flex w-full items-center justify-between rounded px-2 py-2 ${filter === "pinned" ? "bg-[#34445d] text-white" : "text-[#9aa7bb]"}`}
            >
              <span>Pinned</span>
              <span>{notes.filter((note) => note.pinned).length}</span>
            </button>
          </div>

          <div className="mt-3">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f7d92]">
              Folders
            </p>
            <div className="mt-2 space-y-1 text-sm text-[#9aa7bb]">
              {(folders.length ? folders : ["Workspace"]).map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSearch(folder)}
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#273750] hover:text-white"
                >
                  {folder}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <aside className="border-r border-[#d8dee9] bg-[#f8fafc]">
          <div className="flex items-center justify-between border-b border-[#d8dee9] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">All Notes</h2>
              <p className="text-xs text-[#8b98aa]">{filteredNotes.length} notes</p>
            </div>
            <button
              type="button"
              onClick={createNote}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#bfdbfe] bg-white text-xl leading-none text-[#2563eb]"
              aria-label="Create note"
            >
              +
            </button>
          </div>

          <div className="grid gap-2 border-b border-[#d8dee9] p-3">
            <select value={contextFilter} onChange={(event) => setContextFilter(event.currentTarget.value)} className="h-8 rounded-md border border-[#cfd8e6] bg-white px-2 text-xs">
              <option value="">All contexts</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>{context.title}</option>
              ))}
            </select>
            <select value={funnelFilter} onChange={(event) => setFunnelFilter(event.currentTarget.value)} className="h-8 rounded-md border border-[#cfd8e6] bg-white px-2 text-xs">
              <option value="">All workspace areas</option>
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
              ))}
            </select>
            <select value={assetFilter} onChange={(event) => setAssetFilter(event.currentTarget.value)} className="h-8 rounded-md border border-[#cfd8e6] bg-white px-2 text-xs">
              <option value="">All assets</option>
              {assetOptions.map((asset) => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.currentTarget.value)} className="h-8 rounded-md border border-[#cfd8e6] bg-white px-2 text-xs">
              <option value="">All inspiration</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {filteredNotes.length ? (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={`block w-full border-b border-[#e5eaf2] px-4 py-3 text-left hover:bg-white ${
                    selectedNote?.id === note.id ? "bg-white" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-[#111827]">{note.title}</span>
                    {note.pinned ? <span className="text-xs text-[#2563eb]">Pinned</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[11px] text-[#0369a1]">
                      {note.source}
                    </span>
                    {note.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-[#ede9fe] px-2 py-0.5 text-[11px] text-[#6d28d9]">
                        {tag}
                      </span>
                    ))}
                    {note.asset_key ? (
                      <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[11px] text-[#047857]">
                        {note.asset_key}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[#8b98aa]">{formatDate(note.updated_at)}</p>
                  <p className="mt-1 truncate text-xs text-[#647084]">{notePreview(note.body)}</p>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-[#647084]">No notes found.</p>
            )}
          </div>
        </aside>

        <div className="flex min-h-[520px] flex-col bg-white">
          {selectedNote ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-[#d8dee9] px-4 py-3">
                <select
                  value={selectedNote.source}
                  onChange={(event) => patchSelected({ source: event.currentTarget.value })}
                  className="h-8 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 text-xs font-medium text-[#1d4ed8]"
                >
                  <option>Manual</option>
                  <option>Telegram</option>
                  <option>Slack</option>
                  <option>AI Output</option>
                </select>
                <input
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
                  className="h-8 w-40 rounded-md border border-[#d8dee9] px-3 text-xs outline-none focus:border-[#2f80ed]"
                />
                <input
                  value={selectedNote.folder}
                  onChange={(event) => patchSelected({ folder: event.currentTarget.value })}
                  placeholder="Folder"
                  className="h-8 w-36 rounded-md border border-[#d8dee9] px-3 text-xs outline-none focus:border-[#2f80ed]"
                />
                <select
                  value={selectedNote.visibility}
                  onChange={(event) =>
                    patchSelected({ visibility: event.currentTarget.value as WorkspaceNote["visibility"] })
                  }
                  className="h-8 rounded-md border border-[#bbf7d0] bg-[#ecfdf5] px-3 text-xs font-medium text-[#047857]"
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                </select>
                <button
                  type="button"
                  onClick={() => patchSelected({ pinned: !selectedNote.pinned })}
                  className="h-8 rounded-md border border-[#d8dee9] px-3 text-xs font-medium text-[#647084]"
                >
                  {selectedNote.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="h-8 rounded-md border border-[#d8dee9] px-3 text-xs font-medium text-[#647084]"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={deleteNote}
                  className="h-8 rounded-md border border-[#fecaca] px-3 text-xs font-medium text-[#dc2626]"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={status === "saving" || !dirty[selectedNote.id]}
                  className="ml-auto h-8 rounded-md bg-[#111827] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "saving" ? "Saving..." : dirty[selectedNote.id] ? "Save" : "Saved"}
                </button>
              </div>

              {message ? (
                <p
                  className={`border-b px-4 py-2 text-sm ${
                    status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-[#b7d7cf] bg-[#eef7f5] text-[#0f766e]"
                  }`}
                  role="status"
                >
                  {message}
                </p>
              ) : null}

              <div className="flex-1 px-8 py-8">
                <p className="text-xs text-[#9aa7bb]">
                  Last updated {formatDate(selectedNote.updated_at)}
                </p>
                <input
                  value={selectedNote.title}
                  onChange={(event) => patchSelected({ title: event.currentTarget.value })}
                  className="mt-3 w-full border-0 bg-transparent text-3xl font-bold tracking-[-0.02em] text-[#111827] outline-none"
                  placeholder="Untitled"
                />
                <textarea
                  value={selectedNote.body}
                  onChange={(event) => patchSelected({ body: event.currentTarget.value })}
                  className="mt-5 min-h-[430px] w-full resize-none border-0 bg-transparent text-base leading-7 text-[#111827] outline-none"
                  placeholder="Start writing..."
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center">
              <button
                type="button"
                onClick={createNote}
                className="rounded-md bg-[#111827] px-4 py-2 text-sm font-semibold text-white"
              >
                Create first note
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
