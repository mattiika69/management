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
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-10">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]"
        >
          HyperOptimal Management
        </Link>
        <h1 className="mt-6 text-5xl font-bold leading-tight text-[#171717]">
          {title}
        </h1>
        <div className="mt-8 space-y-8 text-base leading-7 text-[#4a4a43]">
          {children}
        </div>
      </article>
    </main>
  );
}
