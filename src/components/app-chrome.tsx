"use client";

import Link from "next/link";
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

const appLinks = [
  { label: "Management", href: "/" },
  { label: "Follow Up", href: "https://follow-up-mattiika69.vercel.app/" },
  { label: "Ads", href: "https://ads-mattiika69.vercel.app/" },
  { label: "Planning", href: "https://planning-mattiika69.vercel.app/" },
  { label: "Metrics", href: "https://metrics-mattiika69.vercel.app/" },
  { label: "Funnel", href: "https://funnel-mattiika69.vercel.app/" },
  { label: "Content", href: "https://content-mattiika69.vercel.app/" },
];

function AppFooter() {
  return (
    <footer className="shrink-0 border-t border-[#e4e7ec] bg-white/92 px-6 py-2.5 text-[10.5px] font-medium text-[#98a2b3] lg:px-8">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-semibold text-[#667085]">HyperOptimal Management</span>
          <span>© 2026 HyperOptimal. All rights reserved.</span>
          <Link href="/terms" className="transition hover:text-[#101828]">
            Terms of Service
          </Link>
          <Link href="/privacy" className="transition hover:text-[#101828]">
            Privacy Policy
          </Link>
        </div>
        <nav aria-label="HyperOptimal apps" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {appLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition hover:text-[#101828]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          {children}
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
