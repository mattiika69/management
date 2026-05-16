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
  { id: "ai-context-document", label: "AI Context Document", href: "/ai-company-document", groupId: "company" },
  { id: "management-overview", label: "Overview", href: "/management", groupId: "management" },
  { id: "job-descriptions", label: "Job Descriptions", href: "/management/job-descriptions", groupId: "management" },
  { id: "hiring", label: "Hiring", href: "/management/hiring", groupId: "management" },
  { id: "training", label: "Training", href: "/management/training", groupId: "management" },
  { id: "meetings", label: "Meetings", href: "/meetings", groupId: "management" },
];

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: "company",
    label: "Company",
    itemIds: ["ai-context-document"],
  },
  {
    id: "management",
    label: "Management",
    itemIds: ["management-overview", "job-descriptions", "hiring", "training", "meetings"],
  },
  {
    id: "inspiration",
    label: "Inspiration",
    href: "/inspiration",
    itemIds: [],
  },
  {
    id: "notes",
    label: "Notes",
    href: "/notes",
    itemIds: [],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
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
