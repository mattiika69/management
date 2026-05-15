"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_CLASS =
  "inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm font-medium text-[color:var(--color-ink-700)] transition-colors hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-900)]";

export function SignOutButton({
  className = DEFAULT_CLASS,
  children,
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  children?: ReactNode;
}) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={signOut} className={className}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {children ?? "Sign out"}
    </button>
  );
}
