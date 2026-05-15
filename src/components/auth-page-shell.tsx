import Link from "next/link";
import { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-10 md:grid-cols-[1fr_420px]">
          <div className="self-center">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]"
            >
              HyperOptimal Funnel
            </Link>
            <h2 className="mt-5 max-w-2xl text-5xl font-bold leading-[1.02] text-[#171717]">
              Secure access for every workspace.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#4a4a43]">
              Manage your funnel workspace, team, billing, and communications from one place.
            </p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
