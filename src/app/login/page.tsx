import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "@/components/login-form";
import { safeRelativePath } from "@/lib/auth/redirects";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect?: string; notice?: string; email?: string }>;
}) {
  const { next, redirect: redirectParam, notice, email } = await searchParams;
  const nextPath = safeRelativePath(redirectParam ?? next, "/management");

  if (isAuthBypassEnabled() && !nextPath.startsWith("/invite/")) {
    redirect(nextPath);
  }

  return (
    <AuthPageShell>
      <LoginForm initialEmail={email} next={nextPath} notice={notice} />
    </AuthPageShell>
  );
}
