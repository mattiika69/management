import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { SignupForm } from "@/components/signup-form";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const inviteNext = next?.startsWith("/invite/") && !next.startsWith("//");

  if (isAuthBypassEnabled() && !inviteNext) {
    redirect("/management");
  }

  const safeNext = inviteNext ? next : "/get-started";

  return (
    <AuthPageShell>
      <SignupForm initialEmail={email} next={safeNext ?? "/get-started"} />
    </AuthPageShell>
  );
}
