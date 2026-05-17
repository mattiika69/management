"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

export type TrainingPerson = {
  key: string;
  employeeId: string | null;
  name: string;
  role: string;
  initials: string;
};

export type TrainingProgram = {
  id: string;
  employee_id: string | null;
  title: string;
  owner_name: string;
  outcomes: string;
  cadence: string;
  status: string;
};

export type TrainingItem = {
  id: string;
  program_id: string;
  day_number: number;
  item_order: number;
  item_type: string;
  title: string;
  estimated_minutes: number;
  resource_url: string;
  details: string;
  sop_reference: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProgramForm = {
  title: string;
  employeeId: string;
  ownerName: string;
  outcomes: string;
  cadence: string;
  status: string;
};

type ItemForm = {
  dayNumber: string;
  itemType: string;
  title: string;
  estimatedMinutes: string;
  resourceUrl: string;
  details: string;
  sopReference: string;
};

const defaultProgramForm: ProgramForm = {
  title: "Cold Email",
  employeeId: "",
  ownerName: "",
  outcomes: "",
  cadence: "daily",
  status: "active",
};

const defaultItemForm: ItemForm = {
  dayNumber: "1",
  itemType: "learning",
  title: "",
  estimatedMinutes: "15",
  resourceUrl: "",
  details: "",
  sopReference: "",
};

const trainingDays = Array.from({ length: 15 }, (_, index) => index + 1);
const fallbackTemplates = ["Account Executive", "Cold Email"];

function programToForm(program: TrainingProgram): ProgramForm {
  return {
    title: program.title,
    employeeId: program.employee_id ?? "",
    ownerName: program.owner_name,
    outcomes: program.outcomes,
    cadence: program.cadence,
    status: program.status,
  };
}

function itemToForm(item: TrainingItem): ItemForm {
  return {
    dayNumber: String(item.day_number),
    itemType: item.item_type,
    title: item.title,
    estimatedMinutes: String(item.estimated_minutes),
    resourceUrl: item.resource_url,
    details: item.details,
    sopReference: item.sop_reference,
  };
}

function dayLabel(day: number) {
  return `Day ${day}`;
}

function personName(people: TrainingPerson[], employeeId: string | null) {
  if (!employeeId) return "Not assigned";
  return people.find((person) => person.employeeId === employeeId)?.name ?? "Not assigned";
}

export function TrainingScreeningWorkspace({
  initialPrograms,
  initialItems,
  people,
}: {
  initialPrograms: TrainingProgram[];
  initialItems: TrainingItem[];
  people: TrainingPerson[];
}) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [items, setItems] = useState(initialItems);
  const [selectedProgramId, setSelectedProgramId] = useState(initialPrograms[0]?.id ?? "");
  const [programForm, setProgramForm] = useState<ProgramForm>(
    initialPrograms[0] ? programToForm(initialPrograms[0]) : defaultProgramForm,
  );
  const [itemForm, setItemForm] = useState<ItemForm>(defaultItemForm);
  const [editingItemId, setEditingItemId] = useState("");
  const [draggingItemId, setDraggingItemId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const templates = useMemo(() => {
    const titles = new Set([...fallbackTemplates, ...programs.map((program) => program.title).filter(Boolean)]);
    return Array.from(titles);
  }, [programs]);

  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? null;
  const selectedItems = items.filter((item) => item.program_id === selectedProgramId && item.status !== "archived");
  const itemsByDay = useMemo(() => {
    const map = new Map<number, TrainingItem[]>();
    for (const item of selectedItems) {
      const dayItems = map.get(item.day_number) ?? [];
      dayItems.push(item);
      map.set(item.day_number, dayItems);
    }
    for (const dayItems of map.values()) {
      dayItems.sort((a, b) => a.item_order - b.item_order || a.created_at.localeCompare(b.created_at));
    }
    return map;
  }, [selectedItems]);

  function chooseProgram(program: TrainingProgram) {
    setSelectedProgramId(program.id);
    setProgramForm(programToForm(program));
    setEditingItemId("");
    setItemForm(defaultItemForm);
    setStatus("");
    setError("");
  }

  function chooseTemplate(title: string) {
    setProgramForm((current) => ({ ...current, title }));
  }

  function choosePerson(person: TrainingPerson) {
    setProgramForm((current) => ({
      ...current,
      employeeId: person.employeeId ?? "",
      ownerName: current.ownerName || people.find((candidate) => candidate.role.toLowerCase().includes("owner"))?.name || "",
    }));
  }

  async function saveProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving-program");
    setError("");

    const response = await fetch("/api/management/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(programForm),
    });
    const body = (await response.json().catch(() => ({}))) as {
      trainingProgram?: TrainingProgram;
      error?: string;
    };

    if (!response.ok || !body.trainingProgram) {
      setStatus("");
      setError(body.error ?? "Training plan could not be saved.");
      return;
    }

    setPrograms((current) => [body.trainingProgram as TrainingProgram, ...current]);
    setSelectedProgramId(body.trainingProgram.id);
    setStatus("program-saved");
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProgramId) {
      setError("Save a training plan before adding items.");
      return;
    }

    setStatus("saving-item");
    setError("");
    const payload = {
      ...itemForm,
      programId: selectedProgramId,
      dayNumber: Number(itemForm.dayNumber),
      estimatedMinutes: Number(itemForm.estimatedMinutes),
    };
    const response = await fetch(
      editingItemId ? `/api/management/training/items/${editingItemId}` : "/api/management/training/items",
      {
        method: editingItemId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = (await response.json().catch(() => ({}))) as {
      trainingItem?: TrainingItem;
      error?: string;
    };

    if (!response.ok || !body.trainingItem) {
      setStatus("");
      setError(body.error ?? "Training item could not be saved.");
      return;
    }

    setItems((current) => {
      const withoutItem = current.filter((item) => item.id !== body.trainingItem?.id);
      return [...withoutItem, body.trainingItem as TrainingItem];
    });
    setEditingItemId("");
    setItemForm(defaultItemForm);
    setStatus("item-saved");
  }

  async function moveItemToDay(itemId: string, dayNumber: number) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item || item.day_number === dayNumber) return;

    setItems((current) =>
      current.map((candidate) =>
        candidate.id === itemId ? { ...candidate, day_number: dayNumber } : candidate,
      ),
    );
    setDraggingItemId("");

    const response = await fetch(`/api/management/training/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNumber }),
    });

    if (!response.ok) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId ? { ...candidate, day_number: item.day_number } : candidate,
        ),
      );
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Training item could not be moved.");
    }
  }

  function editItem(item: TrainingItem) {
    setEditingItemId(item.id);
    setItemForm(itemToForm(item));
    setError("");
    setStatus("");
  }

  async function deleteItem(itemId: string) {
    setStatus(`deleting:${itemId}`);
    setError("");

    const response = await fetch(`/api/management/training/items/${itemId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus("");
      setError(body.error ?? "Training item could not be deleted.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
    if (editingItemId === itemId) {
      setEditingItemId("");
      setItemForm(defaultItemForm);
    }
    setStatus("item-deleted");
  }

  return (
    <section className="w-full max-w-[1500px] space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="app-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-[#fbfcfe] px-4 py-3">
            <h2 className="text-[13px] font-bold text-[#101828]">Templates</h2>
            <span className="text-[11px] font-semibold text-[#667085]">{templates.length} saved</span>
          </div>
          <div className="flex gap-3 overflow-x-auto p-3">
            {templates.map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => chooseTemplate(template)}
                className={`min-w-[190px] rounded-[8px] border px-3 py-3 text-left transition ${
                  programForm.title === template
                    ? "border-[#2f7bff] bg-[#eff6ff]"
                    : "border-[#d9e1ee] bg-white hover:border-[#b8c7dc]"
                }`}
              >
                <span className="block text-[13px] font-bold text-[#101828]">{template}</span>
                <span className="mt-1 block text-[11px] font-medium text-[#667085]">
                  {programs.filter((program) => program.title === template).length || 0} plans
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="app-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-[#fbfcfe] px-4 py-3">
            <h2 className="text-[13px] font-bold text-[#101828]">People</h2>
            <span className="text-[11px] font-semibold text-[#667085]">{people.length} available</span>
          </div>
          <div className="flex gap-3 overflow-x-auto p-3">
            {people.map((person) => {
              const active = programForm.employeeId && person.employeeId === programForm.employeeId;
              return (
                <button
                  key={person.key}
                  type="button"
                  onClick={() => choosePerson(person)}
                  className={`flex min-w-[210px] items-center gap-3 rounded-[8px] border px-3 py-3 text-left transition ${
                    active
                      ? "border-[#2f7bff] bg-[#eff6ff]"
                      : "border-[#d9e1ee] bg-white hover:border-[#b8c7dc]"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#344054] text-[12px] font-bold text-white">
                    {person.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-[#101828]">{person.name}</span>
                    <span className="mt-1 block truncate text-[11px] font-medium text-[#667085]">{person.role}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <form onSubmit={saveProgram} className="app-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-[#fbfcfe] px-4 py-3">
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#475467]">Admin</h2>
            <p className="mt-1 text-[12px] font-medium text-[#667085]">
              {selectedProgram
                ? `${selectedProgram.title} · ${personName(people, selectedProgram.employee_id)}`
                : "Create or select a training plan"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {programs.length ? (
              <select
                value={selectedProgramId}
                onChange={(event) => {
                  const program = programs.find((candidate) => candidate.id === event.currentTarget.value);
                  if (program) chooseProgram(program);
                }}
                className="app-field h-9 min-w-[220px] normal-case"
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            ) : null}
            <button type="submit" disabled={status === "saving-program"} className="app-button-primary h-9 px-4">
              {status === "saving-program" ? "Saving..." : "Save Plan"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[1.1fr_1fr_1fr_0.8fr_0.8fr]">
          <label className="app-label">
            Training Role
            <input
              value={programForm.title}
              onChange={(event) => setProgramForm({ ...programForm, title: event.currentTarget.value })}
              className="app-field normal-case"
              placeholder="Cold Email"
              required
            />
          </label>
          <label className="app-label">
            Person In Training
            <select
              value={programForm.employeeId}
              onChange={(event) => setProgramForm({ ...programForm, employeeId: event.currentTarget.value })}
              className="app-field normal-case"
            >
              <option value="">Select person</option>
              {people.filter((person) => person.employeeId).map((person) => (
                <option key={person.key} value={person.employeeId ?? ""}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="app-label">
            Person Training Them
            <input
              value={programForm.ownerName}
              onChange={(event) => setProgramForm({ ...programForm, ownerName: event.currentTarget.value })}
              className="app-field normal-case"
              placeholder="Trainer name"
            />
          </label>
          <label className="app-label">
            Cadence
            <select
              value={programForm.cadence}
              onChange={(event) => setProgramForm({ ...programForm, cadence: event.currentTarget.value })}
              className="app-field normal-case"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="app-label">
            Status
            <select
              value={programForm.status}
              onChange={(event) => setProgramForm({ ...programForm, status: event.currentTarget.value })}
              className="app-field normal-case"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        </div>
      </form>

      <form onSubmit={saveItem} className="app-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-[#fbfcfe] px-4 py-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#475467]">
            {editingItemId ? "Edit Training Item" : "Add Training Item"}
          </h2>
          <button type="submit" disabled={status === "saving-item" || !selectedProgramId} className="app-button-primary h-8 px-3 text-[11px]">
            {status === "saving-item" ? "Saving..." : editingItemId ? "Save Item" : "Add Item"}
          </button>
        </div>
        <div className="grid gap-3 p-4 xl:grid-cols-[0.55fr_0.8fr_1.3fr_0.7fr_1fr]">
          <label className="app-label">
            Day
            <select
              value={itemForm.dayNumber}
              onChange={(event) => setItemForm({ ...itemForm, dayNumber: event.currentTarget.value })}
              className="app-field normal-case"
            >
              {trainingDays.map((day) => (
                <option key={day} value={day}>
                  {dayLabel(day)}
                </option>
              ))}
            </select>
          </label>
          <label className="app-label">
            Type
            <select
              value={itemForm.itemType}
              onChange={(event) => setItemForm({ ...itemForm, itemType: event.currentTarget.value })}
              className="app-field normal-case"
            >
              <option value="learning">AI Agent</option>
              <option value="task">Task</option>
              <option value="sop">SOP</option>
              <option value="meeting">Meeting</option>
              <option value="review">Review</option>
            </select>
          </label>
          <label className="app-label">
            Title
            <input
              value={itemForm.title}
              onChange={(event) => setItemForm({ ...itemForm, title: event.currentTarget.value })}
              className="app-field normal-case"
              placeholder="AI Agent title"
              required
            />
          </label>
          <label className="app-label">
            Est. Time
            <input
              value={itemForm.estimatedMinutes}
              onChange={(event) => setItemForm({ ...itemForm, estimatedMinutes: event.currentTarget.value })}
              className="app-field normal-case"
              min={0}
              type="number"
            />
          </label>
          <label className="app-label">
            Resource URL
            <input
              value={itemForm.resourceUrl}
              onChange={(event) => setItemForm({ ...itemForm, resourceUrl: event.currentTarget.value })}
              className="app-field normal-case"
              placeholder="https://..."
            />
          </label>
          <label className="app-label xl:col-span-3">
            Details
            <textarea
              value={itemForm.details}
              onChange={(event) => setItemForm({ ...itemForm, details: event.currentTarget.value })}
              className="app-textarea min-h-[72px] normal-case"
              placeholder="Notes or instructions"
            />
          </label>
          <label className="app-label xl:col-span-2">
            SOP
            <input
              value={itemForm.sopReference}
              onChange={(event) => setItemForm({ ...itemForm, sopReference: event.currentTarget.value })}
              className="app-field normal-case"
              placeholder="Select or paste SOP"
            />
          </label>
        </div>
      </form>

      {error ? <p className="text-[12px] font-semibold text-red-600">{error}</p> : null}
      {status === "program-saved" || status === "item-saved" || status === "item-deleted" ? (
        <p className="text-[12px] font-semibold text-emerald-700">Saved.</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {trainingDays.map((day) => {
          const dayItems = itemsByDay.get(day) ?? [];
          return (
            <section
              key={day}
              className="app-card min-h-[114px] overflow-hidden"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingItemId) void moveItemToDay(draggingItemId, day);
              }}
            >
              <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-white px-3 py-2.5">
                <h3 className="text-[14px] font-bold text-[#101828]">{dayLabel(day)}</h3>
                <span className="text-[11px] font-semibold text-[#667085]">
                  {dayItems.length} {dayItems.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="space-y-2 p-3">
                {dayItems.length ? (
                  dayItems.map((item) => (
                    <article
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggingItemId(item.id)}
                      onDragEnd={() => setDraggingItemId("")}
                      className="cursor-move rounded-[7px] border border-[#d9e1ee] bg-[#fbfcfe] p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#101828]">{item.title}</p>
                          <p className="mt-1 text-[11px] font-semibold capitalize text-[#667085]">
                            {item.item_type} · {item.estimated_minutes} min
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => editItem(item)} className="text-[11px] font-bold text-[#155dfc]">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            disabled={status === `deleting:${item.id}`}
                            className="text-[11px] font-bold text-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {item.details ? <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#475467]">{item.details}</p> : null}
                    </article>
                  ))
                ) : (
                  <div className="grid min-h-[70px] place-items-center rounded-[7px] border border-dashed border-[#d9e1ee] bg-[#fbfcfe] px-3 text-center text-[12px] font-medium text-[#667085]">
                    Drag training items here.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
