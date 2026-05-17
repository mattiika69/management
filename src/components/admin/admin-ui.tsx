import Link from "next/link";
import type { ReactNode } from "react";

const adminTabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orgs", label: "Organizations" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/webhook-events", label: "Webhook Events" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export function AdminPageShell({
  active,
  title,
  children,
}: {
  active: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-8 py-8 text-[#101828]">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667085]">
            Admin
          </p>
          <h1 className="text-[22px] font-extrabold leading-tight">{title}</h1>
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Admin navigation">
            {adminTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active === tab.href
                    ? "inline-flex h-8 items-center rounded-[6px] bg-[#101828] px-3 text-[12px] font-bold text-white shadow-sm"
                    : "inline-flex h-8 items-center rounded-[6px] border border-[#d9e1ee] bg-white px-3 text-[12px] font-semibold text-[#475467] shadow-sm hover:border-[#b9c6d8] hover:text-[#101828]"
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[8px] border border-[#d9e1ee] bg-white p-5 shadow-sm">
      <div className="text-[12px] font-semibold text-[#667085]">{label}</div>
      <div className="mt-3 text-[28px] font-extrabold leading-none">{value}</div>
    </div>
  );
}

export function AdminSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-[#d9e1ee] bg-white shadow-sm">
      <div className="border-b border-[#d9e1ee] px-4 py-3">
        <h2 className="text-[14px] font-extrabold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-4 py-8 text-center text-[13px] text-[#667085]">
      {children}
    </div>
  );
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-[#d9e1ee] bg-[#f8fafc]">
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 font-bold uppercase tracking-[0.06em] text-[#667085]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1f7]">{children}</tbody>
      </table>
    </div>
  );
}

export function TableCell({ children }: { children: ReactNode }) {
  return <td className="px-3 py-3 align-top text-[#344054]">{children}</td>;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
