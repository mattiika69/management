"use client";

import type { ButtonHTMLAttributes } from "react";

export function SignOutButton({
  className = "rounded-md border border-[#e8ded2] bg-white px-3 py-2 text-sm font-medium text-[#6f6257] transition hover:border-[#e85b3c] hover:text-[#2d2620]",
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  function signOut() {
    window.location.assign("/logout");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className={className}
    >
      Log Out
    </button>
  );
}
