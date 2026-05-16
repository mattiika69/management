"use client";

import { useMemo, useState } from "react";
import { OperationsTabs } from "@/components/operations-ui";
import { formatInputDate } from "@/lib/operations/dates";
import {
  TEAM_MEETING_AGENDA,
  type Meeting,
  type MeetingActionItem,
  type MeetingAgendaItem,
  type MeetingAttendee,
  type MeetingDecision,
  type MeetingsData,
  type MeetingTrainingItem,
  type MeetingType,
} from "@/lib/operations/meetings";
import type { WorkspacePerson } from "@/lib/operations/people";

type MeetingView = "team" | "training" | "one_on_one" | "client";

type Draft = {
  id?: string;
  date: string;
  title: string;
  ownerUserId: string;
  employeeUserId: string;
  clientName: string;
  nextMeetingDate: string;
  notes: string;
  attendees: string[];
  agendaItems: Array<{ title: string; audience: string; minutes: number; completed: boolean }>;
  actionItems: Array<{ title: string; ownerUserId: string; dueDate: string; addToCalendar: boolean; completed: boolean }>;
  decisions: Array<{ decisionText: string; accepted: boolean }>;
  trainingItems: Array<{
    traineeUserId: string;
    trainerUserId: string;
    task: string;
    sopReference: string;
    youDoIt: boolean;
    theyDoIt: boolean;
  }>;
};

const meetingTabs: Array<{ id: MeetingView; label: string; href: string }> = [
  { id: "team", label: "Team Meetings", href: "/meetings?view=team" },
  { id: "training", label: "Training Meetings", href: "/meetings?view=training" },
  { id: "one_on_one", label: "1 on 1 Meetings", href: "/meetings?view=one_on_one" },
  { id: "client", label: "Client Meetings", href: "/meetings?view=client" },
];

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[4px] border border-gray-300 bg-white ${className}`}>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-[28px] rounded-[3px] border border-gray-300 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-[28px] rounded-[3px] border border-gray-300 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500 ${props.className ?? ""}`}
    />
  );
}

function Checkbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="checkbox" className="h-[13px] w-[13px] rounded-[2px] border-gray-400 accent-gray-950" />;
}

function peopleOptions(people: WorkspacePerson[]) {
  return people.map((person) => (
    <option key={person.key} value={person.userId ?? person.key}>
      {person.name}
    </option>
  ));
}

function personName(people: WorkspacePerson[], key: string) {
  return people.find((person) => person.userId === key || person.key === key)?.name ?? key;
}

function initialDraft(type: MeetingType, people: WorkspacePerson[]): Draft {
  const today = formatInputDate();
  const attendeeKeys = people.slice(0, 4).map((person) => person.userId ?? person.key);
  const first = people[0]?.userId ?? people[0]?.key ?? "";
  const second = people[1]?.userId ?? people[1]?.key ?? first;

  return {
    date: today,
    title:
      type === "team"
        ? "New L10 Meeting"
        : type === "training"
          ? "New Training Meeting"
          : type === "one_on_one"
            ? "New 1:1"
            : "New Client Meeting",
    ownerUserId: second,
    employeeUserId: first,
    clientName: "",
    nextMeetingDate: "",
    notes: "",
    attendees: attendeeKeys,
    agendaItems:
      type === "team"
        ? TEAM_MEETING_AGENDA.map((item) => ({ ...item, completed: false }))
        : [],
    actionItems: Array.from({ length: type === "client" ? 1 : 5 }).map(() => ({
      title: "",
      ownerUserId: second,
      dueDate: "",
      addToCalendar: false,
      completed: false,
    })),
    decisions: Array.from({ length: 5 }).map(() => ({ decisionText: "", accepted: true })),
    trainingItems:
      type === "training"
        ? [
            {
              traineeUserId: "",
              trainerUserId: "",
              task: "",
              sopReference: "",
              youDoIt: false,
              theyDoIt: false,
            },
          ]
        : [],
  };
}

function draftFromMeeting(
  type: MeetingType,
  people: WorkspacePerson[],
  meeting: Meeting,
  childData: {
    attendees: MeetingAttendee[];
    agendaItems: MeetingAgendaItem[];
    actionItems: MeetingActionItem[];
    decisions: MeetingDecision[];
    trainingItems: MeetingTrainingItem[];
  },
): Draft {
  const fallback = initialDraft(type, people);
  return {
    id: meeting.id,
    date: meeting.meeting_date,
    title: meeting.title,
    ownerUserId: meeting.owner_user_id ?? "",
    employeeUserId: meeting.employee_user_id ?? "",
    clientName: meeting.client_name ?? "",
    nextMeetingDate: meeting.next_meeting_date ?? "",
    notes: meeting.notes,
    attendees: childData.attendees
      .filter((attendee) => attendee.meeting_id === meeting.id)
      .map((attendee) => attendee.user_id ?? attendee.display_name ?? "")
      .filter(Boolean),
    agendaItems: childData.agendaItems
      .filter((item) => item.meeting_id === meeting.id)
      .map((item) => ({
        title: item.title,
        audience: item.audience,
        minutes: item.minutes,
        completed: item.completed,
      })),
    actionItems:
      childData.actionItems
        .filter((item) => item.meeting_id === meeting.id)
        .map((item) => ({
          title: item.title,
          ownerUserId: item.owner_user_id ?? "",
          dueDate: item.due_date ?? "",
          addToCalendar: item.add_to_calendar,
          completed: item.completed,
        })) || fallback.actionItems,
    decisions:
      childData.decisions
        .filter((item) => item.meeting_id === meeting.id)
        .map((item) => ({ decisionText: item.decision_text, accepted: item.accepted })) ||
      fallback.decisions,
    trainingItems:
      childData.trainingItems
        .filter((item) => item.meeting_id === meeting.id)
        .map((item) => ({
          traineeUserId: item.trainee_user_id ?? "",
          trainerUserId: item.trainer_user_id ?? "",
          task: item.task,
          sopReference: item.sop_reference,
          youDoIt: item.you_do_it,
          theyDoIt: item.they_do_it,
        })) || fallback.trainingItems,
  };
}

async function postMeeting(body: Record<string, unknown>) {
  const response = await fetch("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { meeting?: Meeting; error?: string };
  if (!response.ok) throw new Error(data.error || "Save failed.");
  return data.meeting;
}

export function MeetingsWorkspace({
  data,
  activeView,
}: {
  data: MeetingsData;
  activeView: MeetingView;
}) {
  const [meetings, setMeetings] = useState(data.meetings);
  const [draft, setDraft] = useState<Draft>(() => {
    const firstMeeting = data.meetings.find((meeting) => meeting.meeting_type === activeView);
    if (!firstMeeting) return initialDraft(activeView, data.people);
    return draftFromMeeting(activeView, data.people, firstMeeting, data);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visibleMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.meeting_type === activeView),
    [meetings, activeView],
  );

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateAgenda(index: number, patch: Partial<Draft["agendaItems"][number]>) {
    setDraft((current) => ({
      ...current,
      agendaItems: current.agendaItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateAction(index: number, patch: Partial<Draft["actionItems"][number]>) {
    setDraft((current) => ({
      ...current,
      actionItems: current.actionItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateDecision(index: number, patch: Partial<Draft["decisions"][number]>) {
    setDraft((current) => ({
      ...current,
      decisions: current.decisions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateTraining(index: number, patch: Partial<Draft["trainingItems"][number]>) {
    setDraft((current) => ({
      ...current,
      trainingItems: current.trainingItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const meeting = await postMeeting({
        id: draft.id,
        meetingType: activeView,
        title: draft.title,
        meetingDate: draft.date,
        ownerUserId: draft.ownerUserId || null,
        employeeUserId: draft.employeeUserId || null,
        clientName: draft.clientName || null,
        nextMeetingDate: draft.nextMeetingDate || null,
        notes: draft.notes,
        attendees: draft.attendees.map((key) => ({
          userId: data.people.find((person) => person.userId === key)?.userId ?? null,
          displayName: personName(data.people, key),
        })),
        agendaItems: draft.agendaItems,
        actionItems: draft.actionItems,
        decisions: draft.decisions,
        trainingItems: draft.trainingItems,
      });
      if (meeting) {
        setMeetings((current) => [meeting, ...current.filter((item) => item.id !== meeting.id)]);
        setDraft((current) => ({ ...current, id: meeting.id }));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="text-[11px] text-gray-700">
      <OperationsTabs tabs={meetingTabs} active={activeView} />
      {error ? (
        <div className="mb-3 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-2 xl:grid-cols-[320px_minmax(0,1fr)]">
        <MeetingList
          type={activeView}
          meetings={visibleMeetings}
          people={data.people}
          onNew={() => setDraft(initialDraft(activeView, data.people))}
        />
        {activeView === "team" ? (
          <TeamMeetingEditor people={data.people} draft={draft} saving={saving} onSave={save} updateDraft={updateDraft} updateAgenda={updateAgenda} updateDecision={updateDecision} />
        ) : null}
        {activeView === "training" ? (
          <TrainingMeetingEditor people={data.people} draft={draft} saving={saving} onSave={save} updateDraft={updateDraft} updateTraining={updateTraining} updateAction={updateAction} />
        ) : null}
        {activeView === "one_on_one" ? (
          <OneOnOneEditor people={data.people} draft={draft} saving={saving} onSave={save} updateDraft={updateDraft} updateAction={updateAction} />
        ) : null}
        {activeView === "client" ? (
          <ClientMeetingEditor people={data.people} draft={draft} saving={saving} onSave={save} updateDraft={updateDraft} updateAction={updateAction} />
        ) : null}
      </div>
    </div>
  );
}

function MeetingList({
  type,
  meetings,
  people,
  onNew,
}: {
  type: MeetingView;
  meetings: Meeting[];
  people: WorkspacePerson[];
  onNew: () => void;
}) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="border-b border-gray-200 p-2">
        <Select className="w-full" defaultValue="">
          <option value="">{type === "client" ? "All Clients" : type === "one_on_one" ? "All Employees" : "All Attendees"}</option>
          {peopleOptions(people)}
        </Select>
      </div>
      <div className={type === "one_on_one" ? "max-h-[630px] overflow-y-auto" : ""}>
        {meetings.length ? (
          meetings.slice(0, type === "one_on_one" ? 12 : 4).map((meeting) => (
            <button
              key={meeting.id}
              type="button"
              className="flex h-[58px] w-full items-center justify-between border-b border-gray-100 px-3 text-left hover:bg-gray-50"
            >
              <span>
                <span className="block font-medium text-gray-800">
                  {meeting.client_name || meeting.title.replace(/^New\s*/, "")}
                </span>
                <span className="mt-1 block text-gray-500">
                  {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
                    new Date(`${meeting.meeting_date}T00:00:00`),
                  )}
                </span>
              </span>
              <span className="text-gray-400">×</span>
            </button>
          ))
        ) : (
          <button type="button" onClick={onNew} className="h-[40px] w-full text-center text-gray-400">
            No meetings yet
          </button>
        )}
      </div>
    </SectionCard>
  );
}

function SaveButton({ saving, onSave, label = "Save Meeting" }: { saving: boolean; onSave: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="h-[30px] rounded-[4px] bg-orange-600 px-4 text-[11px] font-bold text-white disabled:opacity-60"
    >
      {saving ? "Saving..." : label}
    </button>
  );
}

function AttendeesField({ people, draft }: { people: WorkspacePerson[]; draft: Draft }) {
  const selected = draft.attendees.slice(0, 4);
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-gray-700">Attendees</label>
      <div className="flex h-[28px] items-center rounded-[3px] border border-gray-300 bg-white px-2">
        <span className="mr-2 text-gray-500">{selected.length} attendees:</span>
        <div className="flex min-w-0 flex-1 gap-1">
          {selected.map((key, index) => (
            <span key={`${key}-${index}`} className="rounded-[3px] border border-gray-200 bg-gray-50 px-2 py-[2px] text-[10px] text-gray-600">
              <span className="mr-1 inline-block h-[6px] w-[6px] rounded-full bg-blue-500" />
              {personName(people, key)}
            </span>
          ))}
        </div>
        <span className="text-gray-400">▼</span>
      </div>
    </div>
  );
}

function TeamMeetingEditor({
  people,
  draft,
  saving,
  onSave,
  updateDraft,
  updateAgenda,
  updateDecision,
}: {
  people: WorkspacePerson[];
  draft: Draft;
  saving: boolean;
  onSave: () => void;
  updateDraft: (patch: Partial<Draft>) => void;
  updateAgenda: (index: number, patch: Partial<Draft["agendaItems"][number]>) => void;
  updateDecision: (index: number, patch: Partial<Draft["decisions"][number]>) => void;
}) {
  const totalMinutes = draft.agendaItems.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex h-[36px] items-center justify-between border-b border-gray-200 px-2">
        <p className="font-bold text-gray-800">{draft.title}</p>
        <SaveButton saving={saving} onSave={onSave} />
      </div>
      <div className="p-2">
        <div className="mb-2 grid gap-2 xl:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-medium text-gray-700">Date</span>
            <Input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} className="w-full" />
          </label>
          <AttendeesField people={people} draft={draft} />
        </div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-medium text-gray-700">Agenda</p>
          <button type="button" className="text-orange-600">+ Add Item</button>
        </div>
        <div className="space-y-1">
          {draft.agendaItems.map((item, index) => (
            <div key={index} className="grid h-[40px] grid-cols-[22px_28px_minmax(0,1fr)_90px_45px_20px] items-center gap-2 bg-gray-50 px-2">
              <Checkbox checked={item.completed} onChange={(event) => updateAgenda(index, { completed: event.target.checked })} />
              <span className="text-gray-400">{index + 1}.</span>
              <span>{item.title}</span>
              <Select value={item.audience} onChange={(event) => updateAgenda(index, { audience: event.target.value })}>
                <option>All</option>
                <option>Owner</option>
              </Select>
              <Input type="number" value={item.minutes} onChange={(event) => updateAgenda(index, { minutes: Number(event.target.value) })} />
              <span className="text-gray-400">x</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-gray-500">Total: {totalMinutes} minutes</p>
        <label className="mt-3 block">
          <span className="mb-1 block font-medium text-gray-700">Meeting Notes</span>
          <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} placeholder="Key discussion points, insights, issues identified..." className="h-[82px] w-full rounded-[3px] border border-gray-300 px-2 py-2 text-[11px] outline-none focus:border-blue-500" />
        </label>
        <div className="mt-3 flex items-center justify-between">
          <p className="font-medium text-gray-700">Decisions Made</p>
          <button type="button" className="text-orange-600">+ Add Decision</button>
        </div>
        <div className="mt-1 space-y-1">
          {draft.decisions.map((decision, index) => (
            <div key={index} className="grid grid-cols-[16px_minmax(0,1fr)_16px] items-center gap-2">
              <span className="text-green-600">✓</span>
              <Input value={decision.decisionText} onChange={(event) => updateDecision(index, { decisionText: event.target.value })} placeholder="Decision made..." className="w-full" />
              <span className="text-gray-400">x</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function TrainingMeetingEditor({
  people,
  draft,
  saving,
  onSave,
  updateDraft,
  updateTraining,
  updateAction,
}: {
  people: WorkspacePerson[];
  draft: Draft;
  saving: boolean;
  onSave: () => void;
  updateDraft: (patch: Partial<Draft>) => void;
  updateTraining: (index: number, patch: Partial<Draft["trainingItems"][number]>) => void;
  updateAction: (index: number, patch: Partial<Draft["actionItems"][number]>) => void;
}) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex h-[36px] items-center justify-between border-b border-gray-200 px-2">
        <p className="font-bold text-gray-800">{draft.title}</p>
        <SaveButton saving={saving} onSave={onSave} />
      </div>
      <div className="p-2">
        <div className="mb-3 grid gap-2 xl:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-medium">Date</span>
            <Input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} className="w-full" />
          </label>
          <AttendeesField people={people} draft={draft} />
        </div>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-medium text-gray-700">Task Training</p>
          <p><span className="text-blue-600">Open SOPs</span> <span className="text-orange-600">+ Add Row</span></p>
        </div>
        <div className="grid h-[45px] grid-cols-[1fr_1fr_1.9fr_1.9fr_130px_130px_14px] items-center gap-2 bg-gray-50 px-2">
          <Select value={draft.trainingItems[0]?.traineeUserId ?? ""} onChange={(event) => updateTraining(0, { traineeUserId: event.target.value })}>
            <option value="">Select trainee...</option>
            {peopleOptions(people)}
          </Select>
          <Select value={draft.trainingItems[0]?.trainerUserId ?? ""} onChange={(event) => updateTraining(0, { trainerUserId: event.target.value })}>
            <option value="">Select trainer...</option>
            {peopleOptions(people)}
          </Select>
          <Input placeholder="Task to train..." value={draft.trainingItems[0]?.task ?? ""} onChange={(event) => updateTraining(0, { task: event.target.value })} />
          <Select value={draft.trainingItems[0]?.sopReference ?? ""} onChange={(event) => updateTraining(0, { sopReference: event.target.value })}>
            <option value="">Select SOP...</option>
          </Select>
          <label className="flex items-center gap-1"><Checkbox checked={draft.trainingItems[0]?.youDoIt ?? false} onChange={(event) => updateTraining(0, { youDoIt: event.target.checked })} /> Done</label>
          <label className="flex items-center gap-1"><Checkbox checked={draft.trainingItems[0]?.theyDoIt ?? false} onChange={(event) => updateTraining(0, { theyDoIt: event.target.checked })} /> Done</label>
          <span className="text-gray-400">x</span>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block font-medium text-gray-700">Notes</span>
          <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} placeholder="Key discussion points, insights, issues identified..." className="h-[82px] w-full rounded-[3px] border border-gray-300 px-2 py-2 text-[11px]" />
        </label>
        <ActionSteps people={people} draft={draft} updateAction={updateAction} />
      </div>
    </SectionCard>
  );
}

function ActionSteps({ people, draft, updateAction }: { people: WorkspacePerson[]; draft: Draft; updateAction: (index: number, patch: Partial<Draft["actionItems"][number]>) => void }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium text-gray-700">Action Steps</p>
        <button type="button" className="text-orange-600">+ Add Step</button>
      </div>
      <div className="space-y-1">
        {draft.actionItems.map((item, index) => (
          <div key={index} className="grid h-[40px] grid-cols-[20px_minmax(0,1fr)_100px_110px_90px_14px] items-center gap-2 bg-gray-50 px-2">
            <Checkbox checked={item.completed} onChange={(event) => updateAction(index, { completed: event.target.checked })} />
            <Input value={item.title} onChange={(event) => updateAction(index, { title: event.target.value })} placeholder="Action step..." className="border-0 bg-transparent" />
            <Select value={item.ownerUserId} onChange={(event) => updateAction(index, { ownerUserId: event.target.value })}>
              {peopleOptions(people)}
            </Select>
            <Input type="date" value={item.dueDate} onChange={(event) => updateAction(index, { dueDate: event.target.value })} />
            <button type="button" className="text-blue-600">Add to Calendar</button>
            <span className="text-gray-400">x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OneOnOneEditor({
  people,
  draft,
  saving,
  onSave,
  updateDraft,
  updateAction,
}: {
  people: WorkspacePerson[];
  draft: Draft;
  saving: boolean;
  onSave: () => void;
  updateDraft: (patch: Partial<Draft>) => void;
  updateAction: (index: number, patch: Partial<Draft["actionItems"][number]>) => void;
}) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex h-[36px] items-center justify-between border-b border-gray-200 px-2">
        <p className="font-bold text-gray-800">{draft.title}</p>
        <SaveButton saving={saving} onSave={onSave} label="Save" />
      </div>
      <div className="p-2">
        <div className="grid gap-2 xl:grid-cols-4">
          <label><span className="mb-1 block font-medium">Employee</span><Select className="w-full" value={draft.employeeUserId} onChange={(event) => updateDraft({ employeeUserId: event.target.value })}>{peopleOptions(people)}</Select></label>
          <label><span className="mb-1 block font-medium">Owner</span><Select className="w-full" value={draft.ownerUserId} onChange={(event) => updateDraft({ ownerUserId: event.target.value })}>{peopleOptions(people)}</Select></label>
          <label><span className="mb-1 block font-medium">Date</span><Input className="w-full" type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} /></label>
          <label><span className="mb-1 block font-medium">Next Meeting</span><Input className="w-full" type="date" value={draft.nextMeetingDate} onChange={(event) => updateDraft({ nextMeetingDate: event.target.value })} /></label>
        </div>
        <div className="mt-3 space-y-2">
          <OneOnOneSection title="1. Metrics Count">
            <div className="grid gap-1 xl:grid-cols-3">
              <MiniMetric label="Work Forms Completed" value="0" />
              <MiniMetric label="Clicks" value="0" />
              <MiniMetric label="Time Spent In App" value="0m" />
            </div>
          </OneOnOneSection>
          <OneOnOneSection title="2. Check In On OKRs And Responsibilities">
            <textarea placeholder="Check in notes on OKRs and responsibilities..." className="h-[47px] w-full rounded-[3px] border border-gray-300 px-2 py-2 text-[11px]" />
          </OneOnOneSection>
          <OneOnOneSection title="3. Management Diamond">
            <div className="h-[190px] rounded-[5px] border border-gray-200 bg-white p-2">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-700 text-white">S</span>
                <span><b>Sauliusl Tvar</b><br /><span className="text-gray-500">Team Member</span></span>
              </div>
              <div className="grid h-[135px] grid-cols-[27%_13%_10%_15%_16%_19%] border border-gray-200 text-[10px]">
                {["DAY", "TASK", "TIME", "FINISHED", "WHY NOT", "HOW TO FIX"].map((heading) => <div key={heading} className="border-r border-gray-100 bg-gray-50 p-2 font-bold">{heading}</div>)}
                <div className="border-r border-gray-100 p-2 font-bold">MON<br /><span className="font-normal text-gray-500">WM scheduled: 0/5</span></div>
                <div className="border-r border-gray-100 p-2 italic text-gray-400">No tasks</div>
                <div className="border-r border-gray-100 p-2 text-gray-400">-</div>
                <div className="border-r border-gray-100 p-2 text-gray-400">-</div>
                <div className="border-r border-gray-100 p-2 text-gray-400">-</div>
                <div className="p-2 text-gray-400">-</div>
              </div>
            </div>
          </OneOnOneSection>
          <OneOnOneSection title="4. Start/Stop/Keep">
            <div className="grid gap-2 xl:grid-cols-6">
              {["Start", "Stop", "Keep", "Manager start", "Manager stop", "Manager keep"].map((label) => <Input key={label} placeholder={`${label}...`} />)}
            </div>
          </OneOnOneSection>
          <OneOnOneSection title="5. Employee Notes And Manager Notes">
            <div className="grid gap-2 xl:grid-cols-2">
              <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} placeholder="Employee notes..." className="h-[46px] rounded-[3px] border border-gray-300 px-2 py-2 text-[11px]" />
              <textarea placeholder="Manager notes..." className="h-[46px] rounded-[3px] border border-gray-300 px-2 py-2 text-[11px]" />
            </div>
          </OneOnOneSection>
          <OneOnOneSection title="6. Blockers">
            <textarea placeholder="Blockers and people issues..." className="h-[58px] w-full rounded-[3px] border border-gray-300 px-2 py-2 text-[11px]" />
          </OneOnOneSection>
        </div>
        <div className="hidden"><ActionSteps people={people} draft={draft} updateAction={updateAction} /></div>
      </div>
    </SectionCard>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[4px] border border-gray-200 bg-gray-50 p-2"><p className="text-[10px] uppercase text-gray-500">{label}</p><p className="text-[16px] font-bold text-gray-900">{value}</p></div>;
}

function OneOnOneSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[5px] border border-gray-300 bg-white p-2"><p className="mb-2 text-[11px] font-bold uppercase text-gray-700">{title}</p>{children}</div>;
}

function ClientMeetingEditor({
  people,
  draft,
  saving,
  onSave,
  updateDraft,
  updateAction,
}: {
  people: WorkspacePerson[];
  draft: Draft;
  saving: boolean;
  onSave: () => void;
  updateDraft: (patch: Partial<Draft>) => void;
  updateAction: (index: number, patch: Partial<Draft["actionItems"][number]>) => void;
}) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex h-[36px] items-center justify-between border-b border-gray-200 px-2">
        <p className="font-bold text-gray-800">New Client Meeting</p>
        <SaveButton saving={saving} onSave={onSave} label="Save" />
      </div>
      <div className="p-2">
        <div className="grid gap-2 xl:grid-cols-[1fr_1fr_1fr]">
          <label><span className="mb-1 block font-medium">Client</span><Input value={draft.clientName} onChange={(event) => updateDraft({ clientName: event.target.value })} placeholder="Type client name..." className="w-full" /></label>
          <label><span className="mb-1 block font-medium">Owner</span><Select value={draft.ownerUserId} onChange={(event) => updateDraft({ ownerUserId: event.target.value })} className="w-full"><option value="">Select owner...</option>{peopleOptions(people)}</Select></label>
          <label><span className="mb-1 block font-medium">Date</span><Input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} className="w-full" /></label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} placeholder="Meeting notes, blockers, and client context..." className="h-[99px] w-full rounded-[3px] border border-gray-300 px-2 py-2 text-[11px]" />
        </label>
        <div className="mt-3 rounded-[5px] border border-gray-300 p-2">
          <div className="mb-1 flex items-center justify-between"><p className="font-medium">Next Meeting</p><button className="text-orange-600" type="button">+ Add Step</button></div>
          <div className="grid grid-cols-[170px_18px_minmax(0,1fr)_150px_140px_80px_45px] items-center gap-2">
            <Input type="date" value={draft.nextMeetingDate} onChange={(event) => updateDraft({ nextMeetingDate: event.target.value })} />
            <span>1.</span>
            <Input value={draft.actionItems[0]?.title ?? ""} onChange={(event) => updateAction(0, { title: event.target.value })} placeholder="Enter next action step..." />
            <Select value={draft.actionItems[0]?.ownerUserId ?? ""} onChange={(event) => updateAction(0, { ownerUserId: event.target.value })}><option value="">Assign to...</option>{peopleOptions(people)}</Select>
            <Input type="date" value={draft.actionItems[0]?.dueDate ?? ""} onChange={(event) => updateAction(0, { dueDate: event.target.value })} />
            <button type="button" className="h-[28px] rounded-[3px] border border-gray-300 bg-white text-[11px]">Calendar</button>
            <button type="button" className="h-[28px] rounded-[3px] border border-gray-300 bg-white text-[11px]">Me</button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
