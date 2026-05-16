export type SidebarItem = {
  id: string;
  label: string;
  href: string;
  groupId: string;
};

export type SidebarGroup = {
  id: string;
  label: string;
  itemIds: string[];
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "system", label: "System", href: "/ai-company-document?tab=system", groupId: "company" },
  { id: "ai-context-document", label: "AI Context Document", href: "/ai-company-document", groupId: "company" },
  { id: "offer", label: "Offer", href: "/ai-company-document?tab=offer", groupId: "company" },
  { id: "constraints", label: "Constraints", href: "/ai-company-document?tab=constraints", groupId: "company" },
  { id: "learning", label: "Learning", href: "/funnels/book-a-call/learning", groupId: "company" },
  { id: "training", label: "Training", href: "/funnels/book-a-call/training", groupId: "company" },
  { id: "inspiration", label: "Inspiration", href: "/inspiration", groupId: "workspace" },
  { id: "notes", label: "Notes", href: "/notes", groupId: "workspace" },
  { id: "account", label: "Account", href: "/settings/account", groupId: "settings" },
  { id: "team", label: "Team", href: "/settings/team", groupId: "settings" },
  { id: "billing", label: "Billing", href: "/settings/billing", groupId: "settings" },
  { id: "integrations", label: "Integrations", href: "/settings/integrations", groupId: "settings" },
  { id: "scheduling", label: "Scheduling", href: "/settings/scheduling", groupId: "settings" },
  { id: "slack", label: "Slack", href: "/settings/slack", groupId: "settings" },
  { id: "telegram", label: "Telegram", href: "/settings/telegram", groupId: "settings" },
];

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: "company",
    label: "Company",
    itemIds: ["system", "ai-context-document", "offer", "constraints", "learning", "training"],
  },
  {
    id: "workspace",
    label: "Workspace",
    itemIds: ["inspiration", "notes"],
  },
  {
    id: "settings",
    label: "Settings",
    itemIds: ["account", "team", "billing", "integrations", "scheduling", "slack", "telegram"],
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
