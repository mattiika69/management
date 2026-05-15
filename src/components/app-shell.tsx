import Link from "next/link";
import type { ReactNode } from "react";

type ShellTab = {
  href: string;
  label: string;
};

export function AppShell({
  active,
  title,
  subtitle,
  tabs = [],
  actions,
  children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  tabs?: ShellTab[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)]">
                {subtitle || "Workspace"}
              </div>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-[color:var(--color-ink-900)]">
                {title}
              </h1>
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </div>

          {tabs.length ? (
            <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-[color:var(--color-border)]">
              {tabs.map((tab) => {
                const isActive = active === tab.href || active === tab.label;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative inline-flex h-9 items-center whitespace-nowrap px-3.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "text-[color:var(--color-ink-900)]"
                        : "text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
                    }`}
                  >
                    {tab.label}
                    {isActive ? (
                      <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[color:var(--color-ink-900)]" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </header>

        <div className="animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
