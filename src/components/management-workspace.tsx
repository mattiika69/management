"use client";

import { useMemo, useState } from "react";
import { addDays, formatMonthDay, formatWeekRange } from "@/lib/operations/dates";
import type {
  ManagementData,
  ManagementDiamondEntry,
  ManagementReview,
  ManagementTeamRating,
  StartStopKeepItem,
} from "@/lib/operations/management";
import {
  CHECKLIST_PERSON_ORDER,
  orderPeople,
  RATING_PERSON_ORDER,
  type WorkspacePerson,
} from "@/lib/operations/people";

type ManagementView =
  | "checklist"
  | "start-stop-keep"
  | "progress"
  | "management-diamond"
  | "team-ratings";

const reviewFields = {
  startStopKeep: "start_stop_keep_complete",
  progress: "progress_complete",
  diamond: "management_diamond_complete",
  rating: "team_rating_complete",
} as const;

const weekDays = ["MON", "TUE", "WED", "THU", "FRI"];

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange?.(event.target.checked)}
      className="h-4 w-4 rounded-[4px] border-[#b8c2d0] accent-[#155dfc]"
    />
  );
}

function WeekButton({ weekStart }: { weekStart: string }) {
  return (
    <div className="inline-flex h-10 items-center gap-5 rounded-[8px] border border-[#d9e1ee] bg-white px-3.5 text-[12px] font-bold text-[#475467] shadow-sm">
      <span className="text-base leading-none text-[#98a2b3]">‹</span>
      <span>{formatWeekRange(weekStart)}</span>
      <span className="text-base leading-none text-[#98a2b3]">›</span>
    </div>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-card ${className}`}>
      {children}
    </div>
  );
}

function personSubject(person: WorkspacePerson, weekStart: string) {
  return {
    subjectKey: person.key,
    subjectName: person.name,
    memberUserId: person.userId,
    weekStart,
  };
}

async function postManagement<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/management", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Save failed.");
  return data;
}

export function ManagementWorkspace({
  data,
  activeView,
}: {
  data: ManagementData;
  activeView: ManagementView;
}) {
  const [reviews, setReviews] = useState(data.reviews);
  const [items, setItems] = useState(data.startStopKeepItems);
  const [diamondEntries, setDiamondEntries] = useState(data.diamondEntries);
  const [ratings, setRatings] = useState(data.teamRatings);
  const [selectedPersonKey, setSelectedPersonKey] = useState(data.people[0]?.key ?? "");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const people = data.people;
  const selectedPerson = people.find((person) => person.key === selectedPersonKey) ?? people[0];
  const checklistPeople = orderPeople(people, CHECKLIST_PERSON_ORDER);
  const ratingPeople = orderPeople(people, RATING_PERSON_ORDER);

  const reviewsByPerson = useMemo(
    () => new Map(reviews.map((review) => [review.subject_key, review])),
    [reviews],
  );
  const ratingsByPerson = useMemo(
    () => new Map(ratings.map((rating) => [rating.subject_key, rating])),
    [ratings],
  );

  async function saveReviewFlag(
    person: WorkspacePerson,
    field: keyof ManagementReview,
    value: boolean,
  ) {
    setPending(`${person.key}:${field}`);
    setError("");
    try {
      const response = await postManagement<{ review: ManagementReview }>({
        action: "setReviewFlag",
        ...personSubject(person, data.weekStart),
        field,
        value,
      });
      setReviews((current) => [
        ...current.filter((review) => review.id !== response.review.id),
        response.review,
      ]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setPending("");
    }
  }

  function reviewValue(person: WorkspacePerson, field: keyof ManagementReview) {
    return Boolean(reviewsByPerson.get(person.key)?.[field]);
  }

  async function addStartStopKeepItem(category: "start" | "stop" | "keep", itemText: string) {
    if (!selectedPerson || !itemText.trim()) return;
    setPending(`${category}:add`);
    setError("");
    try {
      const response = await postManagement<{ item: StartStopKeepItem }>({
        action: "addStartStopKeepItem",
        ...personSubject(selectedPerson, data.weekStart),
        category,
        itemText,
      });
      setItems((current) => [...current, response.item]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setPending("");
    }
  }

  async function archiveStartStopKeepItem(item: StartStopKeepItem) {
    if (!selectedPerson) return;
    setPending(`archive:${item.id}`);
    setError("");
    try {
      await postManagement<{ ok: boolean }>({
        action: "archiveStartStopKeepItem",
        ...personSubject(selectedPerson, data.weekStart),
        itemId: item.id,
      });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setPending("");
    }
  }

  async function saveRating(person: WorkspacePerson, input: Partial<ManagementTeamRating>) {
    setPending(`rating:${person.key}`);
    setError("");
    try {
      const response = await postManagement<{ rating: ManagementTeamRating }>({
        action: "upsertTeamRating",
        ...personSubject(person, data.weekStart),
        rating: {
          currentWeekScore: input.current_week_score ?? null,
          fourWeekAverage: input.four_week_average ?? null,
          trend: input.trend ?? null,
          notes: input.notes ?? "",
        },
      });
      setRatings((current) => [
        ...current.filter((rating) => rating.id !== response.rating.id),
        response.rating,
      ]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setPending("");
    }
  }

  async function saveDiamondEntry(person: WorkspacePerson, dayIndex: number, entry: ManagementDiamondEntry) {
    setPending(`diamond:${person.key}:${dayIndex}`);
    setError("");
    try {
      const response = await postManagement<{ entry: ManagementDiamondEntry }>({
        action: "upsertDiamondEntry",
        ...personSubject(person, data.weekStart),
        dayIndex,
        entry: {
          task: entry.task,
          taskTime: entry.task_time,
          finished: entry.finished,
          whyNot: entry.why_not,
          howToFix: entry.how_to_fix,
        },
      });
      setDiamondEntries((current) => [
        ...current.filter((candidate) => candidate.id !== response.entry.id),
        response.entry,
      ]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="text-[12px] text-[#475467]">
      {!people.length ? (
        <SectionCard className="p-5">
          <h2 className="text-[15px] font-bold text-[#101828]">No team members yet</h2>
          <p className="mt-2 text-[13px] leading-6 text-[#667085]">
            Add employees or invite team members in Settings to start using Management.
          </p>
        </SectionCard>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {activeView === "checklist" ? (
        <ChecklistView
          people={checklistPeople}
          weekStart={data.weekStart}
          pending={pending}
          reviewValue={reviewValue}
          onChange={saveReviewFlag}
        />
      ) : null}
      {activeView === "start-stop-keep" && selectedPerson ? (
        <StartStopKeepView
          people={people}
          selectedPerson={selectedPerson}
          selectedPersonKey={selectedPersonKey}
          weekStart={data.weekStart}
          items={items}
          pending={pending}
          onPersonChange={setSelectedPersonKey}
          onAdd={addStartStopKeepItem}
          onArchive={archiveStartStopKeepItem}
        />
      ) : null}
      {activeView === "progress" && selectedPerson ? (
        <ProgressView
          people={people}
          selectedPerson={selectedPerson}
          selectedPersonKey={selectedPersonKey}
          onPersonChange={setSelectedPersonKey}
        />
      ) : null}
      {activeView === "management-diamond" && selectedPerson ? (
        <ManagementDiamondView
          people={people}
          selectedPerson={selectedPerson}
          selectedPersonKey={selectedPersonKey}
          weekStart={data.weekStart}
          entries={diamondEntries}
          onPersonChange={setSelectedPersonKey}
          onSave={saveDiamondEntry}
        />
      ) : null}
      {activeView === "team-ratings" ? (
        <TeamRatingsView
          people={ratingPeople}
          weekStart={data.weekStart}
          ratingsByPerson={ratingsByPerson}
          pending={pending}
          onSaveRating={saveRating}
        />
      ) : null}
    </div>
  );
}

function ChecklistView({
  people,
  weekStart,
  pending,
  reviewValue,
  onChange,
}: {
  people: WorkspacePerson[];
  weekStart: string;
  pending: string;
  reviewValue: (person: WorkspacePerson, field: keyof ManagementReview) => boolean;
  onChange: (person: WorkspacePerson, field: keyof ManagementReview, value: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <WeekButton weekStart={weekStart} />
      </div>
      <SectionCard className="mb-3 p-5">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#475467]">Management Checklist</p>
        <p className="text-[13px] leading-6 text-[#667085]">
          Check off the workflows you reviewed for each employee for {formatWeekRange(weekStart)}.
        </p>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="app-table-head">
            <tr className="border-b border-[#e4e7ec]">
              <th className="w-[27%] px-3 py-3 font-bold">Employee</th>
              <th className="px-3 py-3 text-center font-bold">Start/Stop/Keep</th>
              <th className="px-3 py-3 text-center font-bold">Progress</th>
              <th className="px-3 py-3 text-center font-bold">Management Diamond</th>
              <th className="px-3 py-3 text-center font-bold">Team Rating</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.key} className="h-12 border-b border-[#edf0f5] last:border-b-0 hover:bg-[#f8fafc]">
                <td className="px-3 font-semibold text-[#101828]">{person.name}</td>
                <td className="px-3 text-center">
                  <Checkbox
                    checked={reviewValue(person, reviewFields.startStopKeep)}
                    onChange={(checked) => onChange(person, reviewFields.startStopKeep, checked)}
                  />
                </td>
                <td className="px-3 text-center">
                  <Checkbox
                    checked={reviewValue(person, reviewFields.progress)}
                    onChange={(checked) => onChange(person, reviewFields.progress, checked)}
                  />
                </td>
                <td className="px-3 text-center">
                  <Checkbox
                    checked={reviewValue(person, reviewFields.diamond)}
                    onChange={(checked) => onChange(person, reviewFields.diamond, checked)}
                  />
                </td>
                <td className="px-3 text-center">
                  <Checkbox
                    checked={reviewValue(person, reviewFields.rating)}
                    onChange={(checked) => onChange(person, reviewFields.rating, checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      {pending ? <span className="sr-only">Saving</span> : null}
    </div>
  );
}

function StartStopKeepView({
  people,
  selectedPerson,
  selectedPersonKey,
  weekStart,
  items,
  pending,
  onPersonChange,
  onAdd,
  onArchive,
}: {
  people: WorkspacePerson[];
  selectedPerson: WorkspacePerson;
  selectedPersonKey: string;
  weekStart: string;
  items: StartStopKeepItem[];
  pending: string;
  onPersonChange: (key: string) => void;
  onAdd: (category: "start" | "stop" | "keep", itemText: string) => void;
  onArchive: (item: StartStopKeepItem) => void;
}) {
  const [drafts, setDrafts] = useState({ start: "", stop: "", keep: "" });
  const itemsByCategory = {
    start: items.filter((item) => item.subject_key === selectedPerson.key && item.category === "start"),
    stop: items.filter((item) => item.subject_key === selectedPerson.key && item.category === "stop"),
    keep: items.filter((item) => item.subject_key === selectedPerson.key && item.category === "keep"),
  };

  function submit(category: "start" | "stop" | "keep") {
    const value = drafts[category];
    void onAdd(category, value);
    setDrafts((current) => ({ ...current, [category]: "" }));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[#667085]">Feedback for</span>
        <select
          value={selectedPersonKey}
          onChange={(event) => onPersonChange(event.target.value)}
          className="app-field min-w-[160px]"
        >
          {people.map((person) => (
            <option key={person.key} value={person.key}>
              {person.name}
            </option>
          ))}
        </select>
        <WeekButton weekStart={weekStart} />
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        {(["start", "stop", "keep"] as const).map((category) => (
          <SectionCard key={category} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#101828] text-[14px] font-bold text-white">
                  {category === "start" ? "+" : category === "stop" ? "-" : "✓"}
                </span>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#101828]">{category}</span>
              </div>
              <span className="rounded-full border border-[#d9e1ee] bg-[#f8fafc] px-2.5 py-1 text-[12px] font-bold text-[#667085]">{itemsByCategory[category].length}</span>
            </div>
            <p className="mb-3 text-[12px] leading-5 text-[#667085]">
              What should {selectedPerson.name} {category} doing?
            </p>
            <div className="mb-3 min-h-[42px] space-y-2">
              {itemsByCategory[category].length ? (
                itemsByCategory[category].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border border-[#e4e7ec] bg-[#fbfcfe] px-3 py-2 text-[12px] font-semibold text-[#101828]"
                  >
                    <span className="min-w-0 truncate">{item.item_text}</span>
                    <button
                      type="button"
                      onClick={() => onArchive(item)}
                      disabled={pending === `archive:${item.id}`}
                      className="shrink-0 text-[11px] font-bold text-[#98a2b3] transition hover:text-red-600 disabled:opacity-50"
                      aria-label={`Remove ${item.item_text}`}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="grid h-[42px] place-items-center border border-dashed border-[#d9e1ee] bg-[#fbfcfe] px-3 text-center text-[11px] font-medium text-[#98a2b3]">
                  No {category} items yet.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={drafts[category]}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [category]: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit(category);
                }}
                placeholder="Add item..."
                className="app-field min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => submit(category)}
                disabled={pending === `${category}:add`}
                className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#101828] text-[16px] font-bold text-white shadow-sm disabled:opacity-50"
              >
                +
              </button>
            </div>
          </SectionCard>
        ))}
      </div>
      <SectionCard className="overflow-hidden">
        <div className="border-b border-gray-200 px-3 py-3">
          <p className="mb-1 text-[12px] font-bold text-[#101828]">Past Weeks</p>
          <p className="text-[12px] text-[#667085]">Click to navigate</p>
        </div>
        <div className="flex h-[48px] items-center justify-between bg-[#f8fafc] px-3 text-[12px] text-[#475467]">
          <span>Week of Mar 29</span>
          <span className="text-[#667085]">0 start, 0 stop, 0 keep</span>
        </div>
      </SectionCard>
    </div>
  );
}

function ProgressView({
  people,
  selectedPerson,
  selectedPersonKey,
  onPersonChange,
}: {
  people: WorkspacePerson[];
  selectedPerson: WorkspacePerson;
  selectedPersonKey: string;
  onPersonChange: (key: string) => void;
}) {
  return (
    <div>
      <SectionCard className="mb-4 flex min-h-[52px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#475467]">Employee</span>
          <select
            value={selectedPersonKey}
            onChange={(event) => onPersonChange(event.target.value)}
            className="app-field min-w-[160px]"
          >
            {people.map((person) => (
              <option key={person.key} value={person.key}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-[12px] font-semibold text-[#667085]">Current snapshot</span>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <div className="flex items-start justify-between border-b border-[#e4e7ec] px-4 py-4">
          <div>
            <p className="text-[15px] font-bold text-[#101828]">{selectedPerson.name}</p>
            <p className="mt-1 text-[12px] font-medium text-[#667085]">{selectedPerson.role}</p>
          </div>
          <div className="flex gap-4 text-[12px] text-[#475467]">
            <span>
              <b>0</b> KPIs
            </span>
            <span>
              <b>0</b> on track
            </span>
            <span>
              <b>0</b> OKRs
            </span>
            <span>
              <b>0%</b> KR complete
            </span>
          </div>
        </div>
        <div className="grid min-h-[735px] gap-4 p-4 xl:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-3 flex justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">
              <span>KPI Ownership</span>
              <span className="font-medium normal-case text-gray-500">0 targeted</span>
            </div>
            <div className="app-muted-box px-4 py-4 text-[12px]">
              No KPIs assigned.
            </div>
          </div>
          <div>
            <div className="mb-3 flex justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-[#667085]">
              <span>Personal OKRs</span>
              <span className="font-medium normal-case text-gray-500">0/0 key results</span>
            </div>
            <div className="app-muted-box px-4 py-4 text-[12px]">
              No progress items saved for this team member yet.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ManagementDiamondView({
  people,
  selectedPerson,
  selectedPersonKey,
  weekStart,
  entries,
  onPersonChange,
  onSave,
}: {
  people: WorkspacePerson[];
  selectedPerson: WorkspacePerson;
  selectedPersonKey: string;
  weekStart: string;
  entries: ManagementDiamondEntry[];
  onPersonChange: (key: string) => void;
  onSave: (person: WorkspacePerson, dayIndex: number, entry: ManagementDiamondEntry) => void;
}) {
  const entriesByDay = new Map(
    entries
      .filter((entry) => entry.subject_key === selectedPerson.key)
      .map((entry) => [entry.day_index, entry]),
  );

  return (
    <div>
      <SectionCard className="mb-4 flex min-h-[52px] items-center justify-between px-4">
        <WeekButton weekStart={weekStart} />
        <label className="flex items-center gap-2 text-[12px] font-bold text-[#667085]">
          User:
          <select
            value={selectedPersonKey}
            onChange={(event) => onPersonChange(event.target.value)}
            className="app-field min-w-[160px]"
          >
            {people.map((person) => (
              <option key={person.key} value={person.key}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e4e7ec] px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#344054] text-[12px] font-bold text-white">
            {selectedPerson.initials}
          </span>
          <div>
            <p className="text-[14px] font-bold text-[#101828]">{selectedPerson.name}</p>
            <p className="text-[12px] font-medium text-[#667085]">{selectedPerson.role}</p>
          </div>
        </div>
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="app-table-head">
            <tr className="border-b border-[#e4e7ec]">
              <th className="w-[27%] px-3 py-3 font-bold">Day</th>
              <th className="w-[13%] px-3 py-3 font-bold">Task</th>
              <th className="w-[10%] px-3 py-3 font-bold">Time</th>
              <th className="w-[15%] px-3 py-3 font-bold">Finished</th>
              <th className="w-[16%] px-3 py-3 font-bold">Why Not</th>
              <th className="w-[19%] px-3 py-3 font-bold">How To Fix</th>
            </tr>
          </thead>
          <tbody>
            {weekDays.map((day, index) => {
              const entry =
                entriesByDay.get(index) ??
                ({
                  id: `${selectedPerson.key}-${index}`,
                  subject_key: selectedPerson.key,
                  subject_name: selectedPerson.name,
                  member_user_id: selectedPerson.userId,
                  week_start: weekStart,
                  day_index: index,
                  task: "",
                  task_time: "",
                  finished: false,
                  why_not: "",
                  how_to_fix: "",
                } satisfies ManagementDiamondEntry);
              return (
                <tr key={day} className="h-[145px] border-b border-[#edf0f5] align-top last:border-b-0 hover:bg-[#fbfcfe]">
                  <td className="border-r border-[#edf0f5] px-3 py-3">
                    <p className="mb-1 font-bold text-[#101828]">{day}</p>
                    <p className="mb-3 text-[10px] font-semibold text-[#667085]">{formatMonthDay(addDays(weekStart, index))}</p>
                    <p className="mb-1 text-[10px] text-[#667085]">WM scheduled: 0/5</p>
                    <p className="mb-1 inline-block rounded-[3px] bg-cyan-100 px-1 text-[9px] text-cyan-700">
                      0% Warm-up scheduled
                    </p>
                    <br />
                    <p className="mb-1 inline-block rounded-[3px] bg-emerald-100 px-1 text-[9px] text-emerald-700">
                      0% Warm-up completed
                    </p>
                    <br />
                    <p className="mb-1 inline-block rounded-[3px] bg-violet-100 px-1 text-[9px] text-violet-700">
                      0% Daily scheduled
                    </p>
                    <br />
                    <p className="inline-block rounded-[3px] bg-amber-100 px-1 text-[9px] text-amber-700">
                      0% Daily completed
                    </p>
                  </td>
                  <td className="border-r border-[#edf0f5] px-3 py-3 text-[#98a2b3] italic">
                    {entry.task ? (
                      <input
                        value={entry.task}
                        onChange={(event) =>
                          onSave(selectedPerson, index, { ...entry, task: event.target.value })
                        }
                        className="h-7 w-full border-0 bg-transparent p-0 text-[12px] not-italic text-[#475467] outline-none"
                      />
                    ) : (
                      "No tasks"
                    )}
                  </td>
                  <td className="border-r border-[#edf0f5] px-3 py-3 text-[#98a2b3]">-</td>
                  <td className="border-r border-[#edf0f5] px-3 py-3 text-[#98a2b3]">-</td>
                  <td className="border-r border-[#edf0f5] px-3 py-3 text-[#98a2b3]">-</td>
                  <td className="px-3 py-3 text-[#98a2b3]">-</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function TeamRatingsView({
  people,
  weekStart,
  ratingsByPerson,
  pending,
  onSaveRating,
}: {
  people: WorkspacePerson[];
  weekStart: string;
  ratingsByPerson: Map<string, ManagementTeamRating>;
  pending: string;
  onSaveRating: (person: WorkspacePerson, input: Partial<ManagementTeamRating>) => void;
}) {
  const gradeBlocks = [
    { grade: "A", range: "9-10", note: "Top performer - keep and promote", className: "bg-emerald-50 text-emerald-700" },
    { grade: "B", range: "7-8.9", note: "Good performer - develop and coach", className: "bg-amber-50 text-amber-700" },
    { grade: "C", range: "5-6.9", note: "Needs improvement - coach or move", className: "bg-orange-50 text-orange-700" },
    { grade: "D", range: "0-4.9", note: "Poor performer - exit plan needed", className: "bg-rose-50 text-rose-700" },
  ];
  return (
    <div>
      <SectionCard className="mb-4 p-4">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#475467]">Player Grades (4-week avg)</p>
        <div className="grid gap-3 xl:grid-cols-4">
          {gradeBlocks.map((block) => (
            <div key={block.grade} className={`flex min-h-[58px] items-center gap-3 rounded-[8px] px-3 ${block.className}`}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-current text-[11px] font-bold">
                <span className="text-white">{block.grade}</span>
              </span>
              <div>
                <p className="text-[13px] font-bold">{block.range}</p>
                <p className="mt-1 text-[10px] font-medium text-[#667085]">{block.note}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <div className="mb-4 grid gap-3 xl:grid-cols-4">
        <SectionCard className="min-h-[78px] p-4">
          <p className="text-[24px] font-bold text-[#101828]">{people.length}</p>
          <p className="mt-1 text-[12px] font-medium text-[#667085]">Team Members</p>
        </SectionCard>
        <SectionCard className="min-h-[78px] border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[24px] font-bold text-emerald-700">0</p>
          <p className="mt-1 text-[12px] font-medium text-emerald-700">A Players</p>
        </SectionCard>
        <SectionCard className="min-h-[78px] border-amber-200 bg-amber-50 p-4">
          <p className="text-[24px] font-bold text-amber-700">0</p>
          <p className="mt-1 text-[12px] font-medium text-amber-700">B Players</p>
        </SectionCard>
        <SectionCard className="min-h-[78px] border-rose-200 bg-rose-50 p-4">
          <p className="text-[24px] font-bold text-rose-700">0</p>
          <p className="mt-1 text-[12px] font-medium text-rose-700">D Players</p>
        </SectionCard>
      </div>
      <SectionCard className="mb-4 flex min-h-[52px] items-center justify-between px-4">
        <WeekButton weekStart={weekStart} />
        <div className="text-[12px] font-semibold text-[#667085]">
          <span>0/{people.length} rated</span>
        </div>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="app-table-head">
            <tr className="border-b border-[#e4e7ec]">
              {[
                "Employee",
                "Grade",
                "4-Wk Avg",
                "This Week",
                "Attitude",
                "Participation",
                "Work Quantity",
                "Work Quality",
                "Improvement",
                "Trend",
                "Action",
              ].map((heading) => (
                <th key={heading} className="px-3 py-3 font-bold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const rating = ratingsByPerson.get(person.key);
              return (
                <tr key={person.key} className="h-[54px] border-b border-[#edf0f5] last:border-b-0 hover:bg-[#f8fafc]">
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#344054] text-[10px] font-bold text-white">
                        {person.initials}
                      </span>
                      <div>
                        <p className="font-bold text-[#101828]">{person.name}</p>
                        <p className="text-[10px] font-medium text-[#667085]">{person.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 text-[#667085]">-</td>
                  <td className="px-3 text-[#667085]">{rating?.four_week_average ?? "-"}</td>
                  <td className="px-3 text-[#667085]">{rating?.current_week_score ?? "-"}</td>
                  <td className="px-3 text-[#667085]">{rating?.attitude_score ?? "-"}</td>
                  <td className="px-3 text-[#667085]">{rating?.participation_score ?? "-"}</td>
                  <td className="px-3 text-[#667085]">{rating?.work_quantity_score ?? "-"}</td>
                  <td className="px-3 text-[#667085]">{rating?.work_quality_score ?? "-"}</td>
                  <td className="px-3 text-[#667085]">{rating?.improvement_score ?? "-"}</td>
                  <td className="px-3 font-semibold text-[#475467]">{rating?.trend ?? "--"}</td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={() => onSaveRating(person, { trend: rating?.trend ?? null })}
                      disabled={pending === `rating:${person.key}`}
                      className="h-8 rounded-[7px] bg-[#101828] px-3 text-[12px] font-bold text-white shadow-sm disabled:opacity-50"
                    >
                      Rate
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
