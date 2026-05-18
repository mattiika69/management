import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "@/components/login-form";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const { next, notice } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/management";

  if (isAuthBypassEnabled() && !nextPath.startsWith("/invite/")) {
    redirect(nextPath);
  }

  return (
    <AuthPageShell>
      <LoginForm next={nextPath} notice={notice} />
    </AuthPageShell>
  );
}
