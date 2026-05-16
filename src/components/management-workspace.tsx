"use client";

import { useMemo, useState } from "react";
import { OperationsTabs } from "@/components/operations-ui";
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

const managementTabs: Array<{ id: ManagementView; label: string; href: string }> = [
  { id: "checklist", label: "Checklist", href: "/management?view=checklist" },
  { id: "start-stop-keep", label: "Start/Stop/Keep", href: "/management?view=start-stop-keep" },
  { id: "progress", label: "Progress", href: "/management?view=progress" },
  { id: "management-diamond", label: "Management Diamond", href: "/management?view=management-diamond" },
  { id: "team-ratings", label: "Team Ratings", href: "/management?view=team-ratings" },
];

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
      className="h-[14px] w-[14px] rounded-[2px] border-gray-400 accent-gray-950"
    />
  );
}

function WeekButton({ weekStart }: { weekStart: string }) {
  return (
    <div className="inline-flex h-[35px] items-center gap-5 rounded-[6px] border border-gray-300 bg-white px-3 text-[11px] font-medium text-gray-700 shadow-sm">
      <span className="text-base leading-none text-gray-500">‹</span>
      <span>{formatWeekRange(weekStart)}</span>
      <span className="text-base leading-none text-gray-500">›</span>
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
    <div className={`rounded-[7px] border border-gray-300 bg-white shadow-sm ${className}`}>
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
  const [selectedPersonKey, setSelectedPersonKey] = useState("carla-bm");
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
    <div className="text-[11px] text-gray-700">
      <OperationsTabs tabs={managementTabs} active={activeView} />
      {error ? (
        <div className="mb-3 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
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
      <SectionCard className="mb-2 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase text-gray-700">Management Checklist</p>
        <p className="text-[11px] text-gray-500">
          Check off the workflows you reviewed for each employee for {formatWeekRange(weekStart)}.
        </p>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.04em] text-gray-600">
            <tr className="border-b border-gray-200">
              <th className="w-[27%] px-3 py-3 font-bold">Employee</th>
              <th className="px-3 py-3 text-center font-bold">Start/Stop/Keep</th>
              <th className="px-3 py-3 text-center font-bold">Progress</th>
              <th className="px-3 py-3 text-center font-bold">Management Diamond</th>
              <th className="px-3 py-3 text-center font-bold">Team Rating</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.key} className="h-[38px] border-b border-gray-100 last:border-b-0">
                <td className="px-3 font-medium text-gray-800">{person.name}</td>
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
}: {
  people: WorkspacePerson[];
  selectedPerson: WorkspacePerson;
  selectedPersonKey: string;
  weekStart: string;
  items: StartStopKeepItem[];
  pending: string;
  onPersonChange: (key: string) => void;
  onAdd: (category: "start" | "stop" | "keep", itemText: string) => void;
}) {
  const [drafts, setDrafts] = useState({ start: "", stop: "", keep: "" });
  const counts = {
    start: items.filter((item) => item.subject_key === selectedPerson.key && item.category === "start").length,
    stop: items.filter((item) => item.subject_key === selectedPerson.key && item.category === "stop").length,
    keep: items.filter((item) => item.subject_key === selectedPerson.key && item.category === "keep").length,
  };

  function submit(category: "start" | "stop" | "keep") {
    const value = drafts[category];
    void onAdd(category, value);
    setDrafts((current) => ({ ...current, [category]: "" }));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-gray-500">Feedback for</span>
        <select
          value={selectedPersonKey}
          onChange={(event) => onPersonChange(event.target.value)}
          className="h-[32px] min-w-[140px] rounded-[5px] border border-gray-300 bg-white px-3 text-[11px] text-gray-700"
        >
          {people.map((person) => (
            <option key={person.key} value={person.key}>
              {person.name}
            </option>
          ))}
        </select>
        <WeekButton weekStart={weekStart} />
      </div>
      <div className="mb-3 grid gap-3 xl:grid-cols-3">
        {(["start", "stop", "keep"] as const).map((category) => (
          <SectionCard key={category} className="p-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-950 text-[13px] font-bold text-white">
                  {category === "start" ? "+" : category === "stop" ? "-" : "✓"}
                </span>
                <span className="text-[11px] font-bold uppercase text-gray-800">{category}</span>
              </div>
              <span className="text-[11px] text-gray-500">{counts[category]}</span>
            </div>
            <p className="mb-2 text-[11px] text-gray-600">
              What should {selectedPerson.name} {category} doing?
            </p>
            <div className="flex gap-1">
              <input
                value={drafts[category]}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [category]: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit(category);
                }}
                placeholder="Add item..."
                className="h-[29px] min-w-0 flex-1 rounded-[5px] border border-gray-300 px-2 text-[11px] outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => submit(category)}
                disabled={pending === `${category}:add`}
                className="h-[29px] w-[25px] rounded-[7px] bg-gray-950 text-[14px] font-bold text-white disabled:opacity-50"
              >
                +
              </button>
            </div>
          </SectionCard>
        ))}
      </div>
      <SectionCard className="overflow-hidden">
        <div className="border-b border-gray-200 px-3 py-3">
          <p className="mb-2 text-[11px] font-bold text-gray-800">Past Weeks</p>
          <p className="text-[11px] text-gray-500">Click to navigate</p>
        </div>
        <div className="flex h-[45px] items-center justify-between bg-gray-50 px-3 text-[11px] text-gray-700">
          <span>Week of Mar 29</span>
          <span className="text-gray-500">0 start, 0 stop, 0 keep</span>
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
  const okrs = [
    "Admin (ToS, Privacy Policy)",
    "Funnel Links/Functionality",
    "Get a Portfolio on Thumbnails",
    "Get a Job Description",
  ];
  return (
    <div>
      <SectionCard className="mb-3 flex h-[43px] items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">Employee</span>
          <select
            value={selectedPersonKey}
            onChange={(event) => onPersonChange(event.target.value)}
            className="h-[25px] min-w-[135px] rounded-[5px] border border-gray-300 bg-white px-2 text-[11px]"
          >
            {people.map((person) => (
              <option key={person.key} value={person.key}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-gray-500">Metrics snapshot: May 15, 10:44 PM</span>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <div className="flex items-start justify-between border-b border-gray-200 px-3 py-3">
          <div>
            <p className="text-[13px] font-bold text-gray-900">{selectedPerson.name}</p>
            <p className="mt-1 text-[11px] text-gray-500">{selectedPerson.role}</p>
          </div>
          <div className="flex gap-4 text-[11px] text-gray-700">
            <span>
              <b>0</b> KPIs
            </span>
            <span>
              <b>0</b> on track
            </span>
            <span>
              <b>8</b> OKRs
            </span>
            <span>
              <b>0%</b> KR complete
            </span>
          </div>
        </div>
        <div className="grid min-h-[735px] gap-3 p-3 xl:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-3 flex justify-between text-[11px] font-bold uppercase text-gray-600">
              <span>KPI Ownership</span>
              <span className="font-medium normal-case text-gray-500">0 targeted</span>
            </div>
            <div className="rounded-[5px] border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-[11px] text-gray-400">
              No KPIs assigned.
            </div>
          </div>
          <div>
            <div className="mb-3 flex justify-between text-[11px] font-bold uppercase text-gray-600">
              <span>Personal OKRs</span>
              <span className="font-medium normal-case text-gray-500">0/8 key results</span>
            </div>
            <div className="space-y-2">
              {okrs.map((okr, index) => (
                <div key={okr} className="rounded-[6px] border border-gray-300 bg-gray-50 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-gray-800">{okr}</span>
                    <span className="font-bold text-gray-700">0%</span>
                  </div>
                  <div className="mb-2 h-[6px] rounded-full bg-gray-200" />
                  <p className="mb-2 text-gray-500">0/1 key results complete</p>
                  <p className="mb-2 font-bold uppercase text-gray-600">Key Results</p>
                  <label className="mb-2 flex items-center gap-2 text-gray-700">
                    <Checkbox checked={false} />
                    {okr}
                  </label>
                  <p className="mb-2 font-bold uppercase text-gray-600">Assignments</p>
                  <p className="text-gray-500">
                    {index === 2
                      ? "Research Jeremy Haynes, Hormozi, Dan Martell and build portfolio"
                      : "No assignments."}
                  </p>
                </div>
              ))}
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
      <SectionCard className="mb-3 flex h-[43px] items-center justify-between px-3">
        <WeekButton weekStart={weekStart} />
        <label className="flex items-center gap-2 text-[11px] text-gray-600">
          User:
          <select
            value={selectedPersonKey}
            onChange={(event) => onPersonChange(event.target.value)}
            className="h-[27px] min-w-[135px] rounded-[5px] border border-gray-300 bg-white px-2 text-[11px]"
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
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-3">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-700 text-[11px] font-bold text-white">
            {selectedPerson.initials}
          </span>
          <div>
            <p className="text-[12px] font-bold text-gray-800">{selectedPerson.name}</p>
            <p className="text-[10px] text-gray-500">{selectedPerson.role}</p>
          </div>
        </div>
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.04em] text-gray-600">
            <tr className="border-b border-gray-200">
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
                <tr key={day} className="h-[145px] border-b border-gray-100 align-top last:border-b-0">
                  <td className="border-r border-gray-100 px-3 py-3">
                    <p className="mb-1 font-bold text-gray-800">{day}</p>
                    <p className="mb-3 text-[10px] text-gray-500">{formatMonthDay(addDays(weekStart, index))}</p>
                    <p className="mb-1 text-[10px] text-gray-500">WM scheduled: 0/5</p>
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
                  <td className="border-r border-gray-100 px-3 py-3 text-gray-400 italic">
                    {entry.task ? (
                      <input
                        value={entry.task}
                        onChange={(event) =>
                          onSave(selectedPerson, index, { ...entry, task: event.target.value })
                        }
                        className="h-7 w-full border-0 bg-transparent p-0 text-[11px] not-italic text-gray-700 outline-none"
                      />
                    ) : (
                      "No tasks"
                    )}
                  </td>
                  <td className="border-r border-gray-100 px-3 py-3 text-gray-400">-</td>
                  <td className="border-r border-gray-100 px-3 py-3 text-gray-400">-</td>
                  <td className="border-r border-gray-100 px-3 py-3 text-gray-400">-</td>
                  <td className="px-3 py-3 text-gray-400">-</td>
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
      <SectionCard className="mb-3 p-2">
        <p className="mb-3 text-[11px] font-bold uppercase text-gray-700">Player Grades (4-week avg)</p>
        <div className="grid gap-2 xl:grid-cols-4">
          {gradeBlocks.map((block) => (
            <div key={block.grade} className={`flex h-[50px] items-center gap-3 rounded-[4px] px-3 ${block.className}`}>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-current text-[10px] font-bold">
                <span className="text-white">{block.grade}</span>
              </span>
              <div>
                <p className="font-bold">{block.range}</p>
                <p className="text-[9px] text-gray-500">{block.note}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <div className="mb-3 grid gap-2 xl:grid-cols-4">
        <SectionCard className="h-[68px] p-3">
          <p className="text-[20px] font-bold text-gray-900">{people.length}</p>
          <p className="mt-2 text-[11px] text-gray-500">Team Members</p>
        </SectionCard>
        <SectionCard className="h-[68px] border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[20px] font-bold text-emerald-700">0</p>
          <p className="mt-2 text-[11px] text-emerald-700">A Players</p>
        </SectionCard>
        <SectionCard className="h-[68px] border-amber-200 bg-amber-50 p-3">
          <p className="text-[20px] font-bold text-amber-700">0</p>
          <p className="mt-2 text-[11px] text-amber-700">B Players</p>
        </SectionCard>
        <SectionCard className="h-[68px] border-rose-200 bg-rose-50 p-3">
          <p className="text-[20px] font-bold text-rose-700">0</p>
          <p className="mt-2 text-[11px] text-rose-700">D Players</p>
        </SectionCard>
      </div>
      <SectionCard className="mb-3 flex h-[43px] items-center justify-between px-3">
        <WeekButton weekStart={weekStart} />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">0/{people.length} rated</span>
          <span>Pod:</span>
          <select className="h-[27px] min-w-[95px] rounded-[5px] border border-gray-300 bg-white px-2 text-[11px]">
            <option>All Pods</option>
          </select>
        </div>
      </SectionCard>
      <SectionCard className="overflow-hidden">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.04em] text-gray-600">
            <tr className="border-b border-gray-100">
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
                <tr key={person.key} className="h-[47px] border-b border-gray-100 last:border-b-0">
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-700 text-[10px] font-bold text-white">
                        {person.initials}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{person.name}</p>
                        <p className="text-[9px] text-gray-500">{person.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 text-gray-500">-</td>
                  <td className="px-3 text-gray-500">{rating?.four_week_average ?? "-"}</td>
                  <td className="px-3 text-gray-500">{rating?.current_week_score ?? "-"}</td>
                  <td className="px-3 text-gray-500">{rating?.attitude_score ?? "-"}</td>
                  <td className="px-3 text-gray-500">{rating?.participation_score ?? "-"}</td>
                  <td className="px-3 text-gray-500">{rating?.work_quantity_score ?? "-"}</td>
                  <td className="px-3 text-gray-500">{rating?.work_quality_score ?? "-"}</td>
                  <td className="px-3 text-gray-500">{rating?.improvement_score ?? "-"}</td>
                  <td className="px-3 text-gray-700">{rating?.trend ?? (person.key === "sauliusl-tvar" ? "+2.0" : "--")}</td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={() => onSaveRating(person, { trend: person.key === "sauliusl-tvar" ? 2 : null })}
                      disabled={pending === `rating:${person.key}`}
                      className="h-[25px] rounded-[4px] bg-gray-950 px-3 text-[11px] font-bold text-white disabled:opacity-50"
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
