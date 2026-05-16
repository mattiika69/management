import Link from "next/link";
import type { ReactNode } from "react";

type ShellTab = {
  href: string;
  label: string;
};

export function AppShell({
  active,
  title,
  tabs = [],
  headerActions,
  children,
}: {
  active: string;
  title: string;
  subtitle: string;
  tabs?: ShellTab[];
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-shell-gradient">
      <div className="page-inner">
        <header className="mb-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-[#101828]">{title}</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#667085]">
                  Member Since March 2026
                </p>
              </div>
            </div>
            {headerActions ? (
              <div className="hidden items-center justify-end gap-2 xl:flex">
                {headerActions}
              </div>
            ) : null}
          </div>

          {tabs.length ? (
            <div className="mt-5 mb-0 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-0 flex flex-wrap gap-2">
                  {tabs.map((tab) => {
                    const isActive = active === tab.href || active === tab.label;
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        className={isActive ? "sm-tab-active" : "sm-tab-inactive"}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </header>

        {children}
      </div>
    </div>
  );
}
