"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import {
  normalizeSidebarOrder,
  orderSidebarGroupItems,
  SIDEBAR_GROUPS,
  SIDEBAR_ITEMS,
  SIDEBAR_ITEM_IDS,
  type SidebarGroup,
  type SidebarItem,
} from "@/lib/sidebar";

function parseHref(href: string) {
  return new URL(href, "https://hyperoptimal.local");
}

function isActiveItem(pathname: string, search: string, href: string) {
  const target = parseHref(href);

  if (target.search) {
    return pathname === target.pathname && search === target.search;
  }

  if (target.pathname === "/settings/account") {
    return pathname === "/settings" || pathname === target.pathname;
  }

  if (target.pathname === "/settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }

  return pathname === target.pathname;
}

function activeGroupIdFor(pathname: string, search: string) {
  const activeItem = SIDEBAR_ITEMS.find((item) => isActiveItem(pathname, search, item.href));
  if (activeItem) return activeItem.groupId;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  if (pathname === "/learn" || pathname.startsWith("/learn/")) return "training";
  if (pathname === "/meetings" || pathname.startsWith("/meetings/")) return "management";
  if (pathname === "/management/training" || pathname.startsWith("/management/training/")) return "training";
  if (
    pathname === "/management/hiring" ||
    pathname.startsWith("/management/hiring/") ||
    pathname === "/management/job-descriptions" ||
    pathname.startsWith("/management/job-descriptions/")
  ) {
    return "hiring";
  }
  return "management";
}

function initialOpenGroups(activeGroupId: string) {
  return Object.fromEntries(SIDEBAR_GROUPS.map((group) => [group.id, group.id === activeGroupId]));
}

function moveItem(order: string[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return order;
  const next = order.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex === -1) return normalizeSidebarOrder(order);
  next.splice(targetIndex, 0, sourceId);
  return normalizeSidebarOrder(next);
}

function DragHandle() {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 grid-cols-2 gap-x-[3px] gap-y-[2px] opacity-30 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-60"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} className="h-[2px] w-[2px] rounded-full bg-[#9aa8bb]" />
      ))}
    </span>
  );
}

function GroupHeader({
  group,
  isOpen,
  onToggle,
}: {
  group: SidebarGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const className =
    "flex h-[29px] w-full items-center gap-[7px] px-2 text-left text-[10px] font-medium uppercase leading-none tracking-[0.11em] text-[#8290a4] transition-colors hover:text-[#a8b5c8]";

  if (group.href) {
    return (
      <Link href={group.href} className={className}>
        <span className="w-3 shrink-0" />
        <span className="truncate">{group.label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={className}
      aria-expanded={isOpen}
    >
      <svg
        className={`h-3 w-3 shrink-0 text-[#8797ad] transition-transform ${isOpen ? "rotate-90" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
      </svg>
      <span className="truncate">{group.label}</span>
    </button>
  );
}

function SidebarNavItem({
  item,
  dragging,
  onDragStart,
  onDrop,
}: {
  item: SidebarItem;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const search = query ? `?${query}` : "";
  const active = isActiveItem(pathname, search, item.href);

  return (
    <div className="py-[1px]">
      <Link
        href={item.href}
        prefetch
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          onDragStart(item.id);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDrop(item.id);
        }}
        onDragEnd={() => onDragStart("")}
        className={`group flex h-[30px] w-full cursor-default items-center justify-between gap-2 rounded-[5px] border px-2 text-left transition-all ${
          active
            ? "border-[#4b8cff] bg-[#223f68] text-[#f8fafc] shadow-[inset_0_0_0_1px_rgba(74,140,255,0.18)]"
            : "border-transparent text-[#a9b5c5] hover:bg-[#243752] hover:text-[#f2f6fb]"
        } ${dragging ? "opacity-55" : ""}`}
      >
        <span
          className={`min-w-0 truncate text-[12px] font-medium leading-none tracking-normal transition-colors ${
            active ? "text-[#f8fafc]" : "text-[#a9b5c5] group-hover:text-[#f2f6fb]"
          }`}
        >
          {item.label}
        </span>
        <DragHandle />
      </Link>
    </div>
  );
}

export function AppSidebar({ authBypassEnabled }: { authBypassEnabled: boolean }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const search = query ? `?${query}` : "";
  const activeGroupId = activeGroupIdFor(pathname, search);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [itemOrder, setItemOrder] = useState(() => normalizeSidebarOrder(SIDEBAR_ITEM_IDS));
  const [draggingId, setDraggingId] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    initialOpenGroups(activeGroupId),
  );
  const groups = useMemo(
    () =>
      SIDEBAR_GROUPS.map((group) => ({
        ...group,
        items: orderSidebarGroupItems(itemOrder, group),
      })),
    [itemOrder],
  );

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/sidebar-order")
      .then((response) => response.json())
      .then((body: { order?: string[] }) => {
        if (!mounted) return;
        setItemOrder(normalizeSidebarOrder(body.order));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  async function saveOrder(nextOrder: string[]) {
    await fetch("/api/settings/sidebar-order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: nextOrder }),
    }).catch(() => {});
  }

  function handleDrop(targetId: string) {
    if (!draggingId) return;
    setItemOrder((current) => {
      const next = moveItem(current, draggingId, targetId);
      void saveOrder(next);
      return next;
    });
    setDraggingId("");
  }

  if (isSidebarCollapsed) {
    return (
      <aside className="sticky top-0 flex h-screen w-10 shrink-0 flex-col border-r border-[#314056] bg-[#1c2b40] text-left text-white">
        <div className="px-1.5 py-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-[#40516b] bg-[#22344e] text-slate-200 shadow-sm transition-colors hover:bg-[#2a3d5a] hover:text-white"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[219px] shrink-0 flex-col border-r border-[#314056] bg-[#1c2b40] text-left text-white shadow-[8px_0_24px_rgba(16,24,40,0.08)]">
      <div className="h-[66px] border-b border-[#314056] px-2.5">
        <div className="flex h-full items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[#2f7bff] shadow-sm ring-1 ring-white/15">
              <span className="text-xs font-bold text-white">H</span>
            </div>
            <span className="truncate text-[13px] font-bold tracking-normal text-white">HyperOptimal</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#40516b] bg-[#22344e] text-slate-200 shadow-sm transition-colors hover:bg-[#2a3d5a] hover:text-white"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-0 py-0">
        <div>
          {groups.map((group) => (
            <section key={group.id} className="mx-2 border-b border-[#314056] py-[5px]">
              {group.label ? (
                <div>
                  <GroupHeader
                    group={group}
                    isOpen={openGroups[group.id] ?? true}
                    onToggle={() =>
                      setOpenGroups((current) => ({
                        ...current,
                        [group.id]: !(current[group.id] ?? true),
                      }))
                    }
                  />
                </div>
              ) : null}
              {!group.href && (openGroups[group.id] ?? true) ? (
                <div className="space-y-[2px] pb-[2px] pt-[2px]">
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      dragging={draggingId === item.id}
                      onDragStart={setDraggingId}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
        {!authBypassEnabled ? (
          <div className="mx-3 mt-3 border-t border-[#314056] pt-3">
            <SignOutButton className="block w-full rounded-[8px] px-2.5 py-2 text-left text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200" />
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
