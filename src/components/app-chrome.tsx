"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

const APP_ROUTE_PREFIXES = [
  "/management",
  "/meetings",
  "/learn",
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
    <div className="flex h-screen overflow-hidden bg-[#f5f7fb] text-[#101828]">
      <Suspense
        fallback={
          <aside className="sticky top-0 h-screen w-[220px] shrink-0 border-r border-[#26354c] bg-[#162234]" />
        }
      >
        <AppSidebar key={pathname} authBypassEnabled={authBypassEnabled} />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
        {children}
      </main>
    </div>
  );
}
