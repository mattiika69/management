"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { orderSidebarItems, normalizeSidebarOrder, SIDEBAR_ITEM_IDS, type SidebarItem } from "@/lib/sidebar";

function isActiveItem(pathname: string, href: string) {
  if (href === "/settings") return pathname === href || pathname.startsWith("/settings/");
  return pathname === href;
}

function moveItem(order: string[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return order;
  const next = order.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex === -1) return normalizeSidebarOrder(order);
  next.splice(targetIndex, 0, sourceId);
  return normalizeSidebarOrder(next);
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
  const active = isActiveItem(pathname, item.href);

  return (
    <div className="border-b border-gray-700/80 py-0.5">
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
        className={`group flex w-full cursor-move items-center rounded-md border px-2 py-1 transition-colors ${
          active
            ? "border-blue-400 bg-slate-900/35 text-blue-100 shadow-[0_0_0_1px_rgba(59,130,246,0.45)]"
            : "border-transparent text-slate-500 hover:bg-slate-700/35 hover:text-slate-300"
        } ${dragging ? "opacity-55" : ""}`}
      >
        <span
          className={`min-w-0 truncate text-[9.7px] font-medium uppercase tracking-[0.0575em] transition-colors ${
            active ? "text-blue-100" : "text-slate-500 group-hover:text-slate-300"
          }`}
        >
          {item.label}
        </span>
      </Link>
    </div>
  );
}

export function AppSidebar({ authBypassEnabled }: { authBypassEnabled: boolean }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [itemOrder, setItemOrder] = useState(() => normalizeSidebarOrder(SIDEBAR_ITEM_IDS));
  const [draggingId, setDraggingId] = useState("");
  const items = useMemo(() => orderSidebarItems(itemOrder), [itemOrder]);

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
      <aside className="sticky top-0 flex h-screen w-9 shrink-0 flex-col border-r border-slate-700/70 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 text-left text-white">
        <div className="px-1.5 py-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/70 bg-slate-700/50 text-slate-300 shadow-sm transition-colors hover:bg-slate-700 hover:text-white"
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
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-slate-700/70 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 text-left text-white">
      <div className="border-b border-gray-700 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500 shadow-sm ring-1 ring-blue-300/40">
              <span className="text-xs font-bold text-white">H</span>
            </div>
            <span className="truncate text-xs font-semibold">HyperOptimal Funnel</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600/70 bg-slate-700/50 text-slate-300 shadow-sm transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1.5">
        {items.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            dragging={draggingId === item.id}
            onDragStart={setDraggingId}
            onDrop={handleDrop}
          />
        ))}
        {!authBypassEnabled ? (
          <div className="mt-1 border-t border-gray-700 pt-1">
            <SignOutButton className="block w-full rounded px-2 py-1 text-left text-xs text-red-400 transition-colors hover:bg-gray-700 hover:text-red-300" />
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
