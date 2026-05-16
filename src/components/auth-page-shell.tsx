import { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#eef4ff] px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full items-center justify-center">
        {children}
      </div>
    </main>
  );
}
