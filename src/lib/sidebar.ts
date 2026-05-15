export type SidebarItem = {
  id: string;
  label: string;
  href: string;
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "ai-context-docs", label: "AI Context Docs", href: "/ai-company-document" },
  { id: "book-a-call-funnel", label: "Book a Call Funnel", href: "/funnels/book-a-call" },
  { id: "book-a-call-learning", label: "Book a Call Learning", href: "/funnels/book-a-call/learning" },
  { id: "book-a-call-training", label: "Book a Call Training", href: "/funnels/book-a-call/training" },
  { id: "inspiration", label: "Inspiration", href: "/inspiration" },
  { id: "notes", label: "Notes", href: "/notes" },
  { id: "settings", label: "Settings", href: "/settings" },
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
