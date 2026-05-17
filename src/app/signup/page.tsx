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
  if (!next?.startsWith("/invite/")) {
    redirect("/login");
  }

  if (isAuthBypassEnabled()) {
    redirect("/");
  }

  return (
    <AuthPageShell>
      <SignupForm next={next ?? "/get-started"} />
    </AuthPageShell>
  );
}
