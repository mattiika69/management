"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

const APP_ROUTE_PREFIXES = [
  "/ai-company-document",
  "/funnels",
  "/inspiration",
  "/notes",
  "/settings",
];

function shouldRenderAppChrome(pathname: string) {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AppChrome({
  authBypassEnabled,
  children,
}: {
  authBypassEnabled: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";

  if (!shouldRenderAppChrome(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--color-bg)] text-[color:var(--color-ink-900)]">
      <AppSidebar key={pathname} authBypassEnabled={authBypassEnabled} />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
        {children}
      </main>
    </div>
  );
}
