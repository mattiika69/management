export type SidebarItem = {
  id: string;
  label: string;
  href: string;
  groupId: string;
};

export type SidebarGroup = {
  id: string;
  label: string;
  href?: string;
  itemIds: string[];
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "management-checklist", label: "Checklist", href: "/management?view=checklist", groupId: "management" },
  { id: "management-start-stop-keep", label: "Start/Stop/Keep", href: "/management?view=start-stop-keep", groupId: "management" },
  { id: "management-progress", label: "Progress", href: "/management?view=progress", groupId: "management" },
  { id: "management-diamond", label: "Management Diamond", href: "/management?view=management-diamond", groupId: "management" },
  { id: "management-team-ratings", label: "Team Ratings", href: "/management?view=team-ratings", groupId: "management" },
  { id: "job-descriptions", label: "Job Descriptions", href: "/management/job-descriptions", groupId: "hiring" },
  { id: "hiring-applicants", label: "Applicants", href: "/management/hiring", groupId: "hiring" },
  { id: "hiring-interviews", label: "Interviews", href: "/management/interviews", groupId: "hiring" },
  { id: "training-onboarding", label: "Onboarding", href: "/management/training", groupId: "training" },
  { id: "training-sops", label: "SOPs", href: "/management/training/sops", groupId: "training" },
  { id: "training-master-library", label: "Master Library", href: "/management/training/master-library", groupId: "training" },
  { id: "training-individual", label: "Individual", href: "/management/training/individual", groupId: "training" },
];

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: "management",
    label: "Management",
    itemIds: [
      "management-checklist",
      "management-start-stop-keep",
      "management-progress",
      "management-diamond",
      "management-team-ratings",
    ],
  },
  {
    id: "hiring",
    label: "Hiring",
    itemIds: ["job-descriptions", "hiring-applicants", "hiring-interviews"],
  },
  {
    id: "training",
    label: "Training",
    itemIds: ["training-onboarding", "training-sops", "training-master-library", "training-individual"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings/account",
    itemIds: [],
  },
];

export const SIDEBAR_ITEM_IDS = SIDEBAR_ITEMS.map((item) => item.id);

export function normalizeSidebarOrder(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  const allowed = new Set(SIDEBAR_ITEM_IDS);
  const uniqueIds = raw.filter((item): item is string => typeof item === "string")
    .filter((item, index, array) => allowed.has(item) && array.indexOf(item) === index);
  return [
    ...uniqueIds,
    ...SIDEBAR_ITEM_IDS.filter((item) => !uniqueIds.includes(item)),
  ];
}

export function orderSidebarItems(order: string[]) {
  const itemsById = new Map(SIDEBAR_ITEMS.map((item) => [item.id, item]));
  return normalizeSidebarOrder(order)
    .map((id) => itemsById.get(id))
    .filter((item): item is SidebarItem => Boolean(item));
}

export function orderSidebarGroupItems(order: string[], group: SidebarGroup) {
  const groupIds = new Set(group.itemIds);
  return orderSidebarItems(order).filter((item) => groupIds.has(item.id));
}
