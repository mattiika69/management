"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import {
  orderSidebarItems,
  normalizeSidebarOrder,
  SIDEBAR_ITEM_IDS,
  type SidebarItem,
} from "@/lib/sidebar";

function isActiveItem(pathname: string, href: string) {
  if (href === "/settings")
    return pathname === href || pathname.startsWith("/settings/");
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

function NavIcon({ id }: { id: string }) {
  const common = "h-4 w-4";
  switch (id) {
    case "ai-context-docs":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case "book-a-call-funnel":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h18l-7 9v7l-4-2v-5z" />
        </svg>
      );
    case "book-a-call-learning":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
        </svg>
      );
    case "book-a-call-training":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "inspiration":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3v0h6v0c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z" />
        </svg>
      );
    case "notes":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H4z" />
          <path d="M16 4v4h4" />
        </svg>
      );
    case "settings":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
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
      className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
        active
          ? "bg-[color:var(--color-surface)] text-[color:var(--color-ink-900)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[color:var(--color-border)]"
          : "text-[color:var(--color-ink-500)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink-900)]"
      } ${dragging ? "opacity-50" : ""}`}
    >
      {active ? (
        <span className="absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[color:var(--color-brand-500)]" />
      ) : null}
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
          active ? "text-[color:var(--color-brand-600)]" : "text-[color:var(--color-ink-400)] group-hover:text-[color:var(--color-ink-700)]"
        }`}
      >
        <NavIcon id={item.id} />
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({ authBypassEnabled }: { authBypassEnabled: boolean }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [itemOrder, setItemOrder] = useState(() =>
    normalizeSidebarOrder(SIDEBAR_ITEM_IDS),
  );
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
      <aside className="sticky top-0 flex h-screen w-12 shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]">
        <div className="flex items-center justify-center px-2 py-3">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-500)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-900)]"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[244px] shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]">
      <div className="px-3.5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--color-ink-900)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <span className="text-[13px] font-bold text-white">H</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                HyperOptimal
              </div>
              <div className="truncate text-[11px] text-[color:var(--color-ink-400)]">
                Funnel Workspace
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-[color:var(--color-ink-400)] transition-colors hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink-900)]"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3.5 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
          Workspace
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              dragging={draggingId === item.id}
              onDragStart={setDraggingId}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </nav>

      {!authBypassEnabled ? (
        <div className="border-t border-[color:var(--color-border)] p-2.5">
          <SignOutButton className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-[color:var(--color-ink-500)] transition-colors hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink-900)]" />
        </div>
      ) : null}
    </aside>
  );
}
