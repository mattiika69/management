"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

  if (target.pathname === "/settings/help") {
    return pathname === target.pathname;
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

function initialOpenGroups() {
  return SIDEBAR_GROUPS.find((group) => !group.href)?.id ?? null;
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
    <span className="ho-sidebar-drag-handle" aria-hidden="true">
      ⋮⋮
    </span>
  );
}

function GroupHeader({
  group,
  isActive,
  isOpen,
  onToggle,
}: {
  group: SidebarGroup;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (group.href) {
    return (
      <Link href={group.href} className={`ho-sidebar-direct-link ${isActive ? "active" : ""}`}>
        {group.label}
      </Link>
    );
  }

  return (
    <div className={`ho-sidebar-parent-block ${isOpen ? "parent-open" : ""} ${isActive ? "parent-active" : ""}`}>
      <div className="ho-sidebar-parent-row">
        <button
          type="button"
          className="ho-sidebar-parent-collapse"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${group.label}`}
        >
          <svg
            className={`ho-sidebar-parent-chevron ${isOpen ? "expanded" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          className="ho-sidebar-parent-link"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          {group.label}
        </button>
      </div>
    </div>
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
    <div
      draggable
      data-item-id={item.id}
      className={`ho-sidebar-menu-row ${active ? "active" : ""} ${dragging ? "dragging" : ""}`}
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
    >
      <Link
        href={item.href}
        prefetch
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        className={`ho-sidebar-sub-link ${active ? "active" : ""}`}
      >
        {item.label}
      </Link>
      <DragHandle />
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
  const [openGroupId, setOpenGroupId] = useState<string | null>(() => activeGroupId || initialOpenGroups());
  const [organizationName, setOrganizationName] = useState("");
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
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
      .then((body: { order?: string[]; organizationName?: string }) => {
        if (!mounted) return;
        setItemOrder(normalizeSidebarOrder(body.order));
        setOrganizationName(typeof body.organizationName === "string" ? body.organizationName : "");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!orgDropdownRef.current?.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
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
      <aside className="ho-side-nav-collapsed">
        <div className="p-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="ho-collapse-dot mx-auto"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            ›
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ho-side-nav">
      <div className="ho-side-shell-header">
        <div className="ho-side-brand-row">
          <Link href="/" className="ho-side-brand">
            <span className="ho-brand-mark" aria-hidden="true">H</span>
            <span className="truncate">HyperOptimal</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="ho-collapse-dot"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            ‹
          </button>
        </div>
        {organizationName ? (
          <div className="ho-sidebar-org-row" ref={orgDropdownRef}>
            <span className="ho-sidebar-org-label">Org:</span>
            <button
              type="button"
              className="ho-sidebar-org-button"
              onClick={() => setOrgDropdownOpen((current) => !current)}
              aria-expanded={orgDropdownOpen}
            >
              <span className="truncate" title={organizationName}>{organizationName}</span>
              <svg
                className={`ho-sidebar-org-chevron ${orgDropdownOpen ? "open" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {orgDropdownOpen ? (
              <div className="ho-sidebar-org-menu">
                <button
                  type="button"
                  className="ho-sidebar-org-menu-item active"
                  onClick={() => setOrgDropdownOpen(false)}
                >
                  <span className="ho-sidebar-org-avatar" aria-hidden="true">
                    {organizationName.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{organizationName}</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <nav className="ho-sidebar-sections" aria-label="Primary navigation">
        <div className="ho-sidebar-grouped-nav">
          {groups.map((group) => {
            const isOpen = !group.href && openGroupId === group.id;

            return (
            <section key={group.id} className={`ho-sidebar-group ${group.id === "settings" ? "with-divider" : ""}`}>
              {group.label ? (
                <div>
                  <GroupHeader
                    group={group}
                    isActive={group.id === activeGroupId}
                    isOpen={isOpen}
                    onToggle={() => setOpenGroupId((current) => (current === group.id ? null : group.id))}
                  />
                </div>
              ) : null}
              {!group.href && isOpen ? (
                <div className="ho-sidebar-child-nav">
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      dragging={draggingId === item.id}
                      onDragStart={setDraggingId}
                      onDrop={handleDrop}
                    />
                  ))}
                  {group.id === "settings" && !authBypassEnabled ? (
                    <SignOutButton className="ho-sidebar-sub-link ho-sidebar-sign-out" />
                  ) : null}
                </div>
              ) : null}
            </section>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
