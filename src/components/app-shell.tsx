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
  children,
}: {
  active: string;
  title: string;
  subtitle: string;
  tabs?: ShellTab[];
  children: ReactNode;
}) {
  return (
    <div className="app-page-shell">
      <div className="page-inner">
        <header className="app-page-header">
          <div className="min-w-0">
            <h1 className="app-page-title">{title}</h1>
            <p className="app-page-kicker">
              Member Since March 2026
            </p>
          </div>

          {tabs.length ? (
            <div className="app-page-tabs">
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
          ) : null}
        </header>

        <div className="app-page-content">{children}</div>
      </div>
    </div>
  );
}
