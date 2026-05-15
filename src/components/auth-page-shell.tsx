import Link from "next/link";
import { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[color:var(--color-bg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, rgba(21,93,252,0.06), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,15,15,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,15,15,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(60% 60% at 50% 30%, black, transparent 80%)",
        }}
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-ink-900)]">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[color:var(--color-ink-900)]">
            HyperOptimal
          </span>
        </Link>
        <div className="flex items-center gap-4 text-[13px] text-[color:var(--color-ink-500)]">
          <Link className="hover:text-[color:var(--color-ink-900)]" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-[color:var(--color-ink-900)]" href="/terms">
            Terms
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </div>

      <footer className="px-6 pb-6 pt-2 text-center text-[12px] text-[color:var(--color-ink-400)]">
        &copy; {new Date().getFullYear()} HyperOptimal. All rights reserved.
      </footer>
    </main>
  );
}
