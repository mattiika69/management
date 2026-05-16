import Link from "next/link";

const chips = [
  { label: "Note", className: "border-violet-200 bg-violet-50 text-violet-700" },
  { label: "Course", className: "border-violet-300 bg-violet-50 text-violet-700" },
  { label: "Content", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { label: "Metrics", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { label: "Constraints", className: "border-amber-300 bg-amber-50 text-amber-700" },
  { label: "Onboarding", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { label: "MDP  O", className: "border-rose-200 bg-rose-50 text-rose-700" },
];

export function OperationsHeaderActions() {
  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          className={`h-[27px] rounded-[5px] border px-2 text-[11px] font-medium leading-none shadow-sm ${chip.className}`}
        >
          {chip.label}
        </button>
      ))}
      <button
        type="button"
        className="inline-flex h-[27px] items-center gap-1 rounded-[5px] border border-orange-500 bg-orange-50 px-2 font-mono text-[11px] font-bold leading-none text-gray-950 shadow-sm"
      >
        <span>00:00</span>
        <span className="grid h-[14px] w-[14px] place-items-center rounded-[3px] border border-orange-300 text-[8px]">
          <span className="ml-[1px] h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-gray-900" />
        </span>
        <span className="grid h-[14px] w-[14px] place-items-center rounded-[3px] border border-orange-300 text-[8px]">
          <span className="h-[8px] w-[8px] rounded-full border border-gray-900" />
        </span>
      </button>
      <span className="h-[24px] w-px bg-gray-300" />
      <button
        type="button"
        className="relative grid h-[27px] w-[24px] place-items-center rounded-[5px] border border-transparent text-[15px] text-gray-500"
        aria-label="Notifications"
      >
        <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        <span className="absolute -right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-orange-600 px-1 text-[8px] font-bold leading-none text-white">
          9+
        </span>
      </button>
    </>
  );
}

export function OperationsTabs({
  tabs,
  active,
}: {
  tabs: Array<{ id: string; label: string; href: string }>;
  active: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={active === tab.id ? "sm-tab-active" : "sm-tab-inactive"}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
