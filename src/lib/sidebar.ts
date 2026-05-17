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
  { id: "management-overview", label: "Overview", href: "/management", groupId: "management" },
  { id: "meetings", label: "Meetings", href: "/meetings", groupId: "management" },
  { id: "job-descriptions", label: "Job Descriptions", href: "/management/job-descriptions", groupId: "hiring" },
  { id: "hiring", label: "Screening", href: "/management/hiring", groupId: "hiring" },
  { id: "training", label: "Training", href: "/management/training", groupId: "training" },
  { id: "settings-home", label: "Settings", href: "/settings/account", groupId: "settings" },
  { id: "settings-agent", label: "AI Agent", href: "/settings/agent", groupId: "settings" },
  { id: "settings-help", label: "Help", href: "/settings/help", groupId: "settings" },
];

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: "management",
    label: "Management",
    itemIds: ["management-overview", "meetings"],
  },
  {
    id: "hiring",
    label: "Hiring",
    itemIds: ["job-descriptions", "hiring"],
  },
  {
    id: "training",
    label: "Training",
    itemIds: ["training"],
  },
  {
    id: "settings",
    label: "Settings",
    itemIds: ["settings-home", "settings-agent", "settings-help"],
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
