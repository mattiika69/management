"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import {
  normalizeSidebarOrder,
  orderSidebarGroupItems,
  SIDEBAR_GROUPS,
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

  return pathname === target.pathname;
}

function isActiveGroup(pathname: string, href?: string) {
  if (!href) return false;
  const target = parseHref(href);

  if (target.pathname === "/settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }

  return pathname === target.pathname || pathname.startsWith(`${target.pathname}/`);
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
      className="grid shrink-0 grid-cols-2 gap-x-[3px] gap-y-[2px] opacity-85 transition-opacity group-hover:opacity-100"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} className="h-[2px] w-[2px] rounded-full bg-[#7b8798]" />
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
  const pathname = usePathname() ?? "";
  const active = isActiveGroup(pathname, group.href);
  const className = `flex h-[29px] w-full items-center gap-1 border-b border-[#2f3f56] px-2 text-left text-[10px] font-medium uppercase tracking-[0.08em] transition-colors ${
    active ? "text-[#dbe6f5]" : "text-[#7f8fa7] hover:text-[#d1d9e6]"
  }`;

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
        className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M9 5l7 7-7 7" />
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
        className={`group flex h-[28px] w-full cursor-move items-center justify-between gap-2 rounded-[4px] border px-2 text-left transition-colors ${
          active
            ? "border-[#3b82f6] bg-[#223654] text-[#f8fafc] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.32)]"
            : "border-transparent text-[#9aa6b8] hover:border-slate-600/50 hover:bg-slate-700/35 hover:text-[#d1d9e6]"
        } ${dragging ? "opacity-55" : ""}`}
      >
        <span
          className={`min-w-0 truncate text-[11px] font-normal tracking-normal transition-colors ${
            active ? "text-[#f8fafc]" : "text-[#9aa6b8] group-hover:text-[#d1d9e6]"
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [itemOrder, setItemOrder] = useState(() => normalizeSidebarOrder(SIDEBAR_ITEM_IDS));
  const [draggingId, setDraggingId] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_GROUPS.map((group) => [group.id, true])),
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
        if (mounted) setItemOrder(normalizeSidebarOrder(body.order));
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
    <aside className="sticky top-0 flex h-screen w-9 shrink-0 flex-col border-r border-[#2f3f56] bg-[#172236] text-left text-white">
        <div className="px-1.5 py-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/90 bg-slate-800/70 text-slate-300 shadow-sm transition-colors hover:bg-slate-700 hover:text-white"
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
    <aside className="sticky top-0 flex h-screen w-[211px] shrink-0 flex-col border-r border-[#2f3f56] bg-[#1b283b] text-left text-white">
      <div className="border-b border-[#2f3f56] px-2 py-[7px]">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-blue-500 shadow-sm ring-1 ring-blue-300/40">
              <span className="text-xs font-bold text-white">H</span>
            </div>
            <span className="truncate text-[13px] font-semibold tracking-[-0.01em]">HyperOptimal Funnel</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600/90 bg-slate-800/70 text-slate-300 shadow-sm transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-0 py-3">
        <div>
          {groups.map((group) => (
            <section key={group.id}>
              {group.label ? (
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
              ) : null}
              {!group.href && (openGroups[group.id] ?? true) ? (
                <div className="space-y-0.5 px-2 pb-1">
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
          <div className="mt-1 border-t border-gray-700 pt-1">
            <SignOutButton className="block w-full rounded px-2 py-1 text-left text-xs text-red-400 transition-colors hover:bg-gray-700 hover:text-red-300" />
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
