import Link from "next/link";
import { ReactNode } from "react";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[color:var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--color-ink-500)] transition-colors hover:text-[color:var(--color-ink-900)]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to HyperOptimal
        </Link>

        <header className="mt-8 border-b border-[color:var(--color-border)] pb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)]">
            Legal
          </div>
          <h1 className="mt-2 text-[40px] font-semibold leading-[1.1] tracking-tight text-[color:var(--color-ink-900)]">
            {title}
          </h1>
        </header>

        <article className="prose prose-neutral mt-8 max-w-none space-y-6 text-[15px] leading-[1.75] text-[color:var(--color-ink-700)] [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[color:var(--color-ink-900)] [&_h3]:mt-6 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-[color:var(--color-ink-900)] [&_a]:font-medium [&_a]:text-[color:var(--color-brand-600)] [&_a:hover]:underline [&_strong]:text-[color:var(--color-ink-900)] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
          {children}
        </article>
      </div>
    </main>
  );
}
