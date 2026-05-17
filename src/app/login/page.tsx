import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "@/components/login-form";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (isAuthBypassEnabled()) {
    redirect(next?.startsWith("/") ? next : "/management");
  }

  return (
    <AuthPageShell>
      <LoginForm next={next ?? "/"} />
    </AuthPageShell>
  );
}
