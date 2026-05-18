import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { SignupForm } from "@/components/signup-form";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const inviteNext = next?.startsWith("/invite/") && !next.startsWith("//");

  if (isAuthBypassEnabled() && !inviteNext) {
    redirect("/management");
  }

  if (!inviteNext) {
    redirect("/login");
  }

  return (
    <AuthPageShell>
      <SignupForm next={next ?? "/get-started"} />
    </AuthPageShell>
  );
}
