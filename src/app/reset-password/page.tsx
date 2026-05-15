import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default function ResetPasswordPage() {
  if (isAuthBypassEnabled()) {
    redirect("/");
  }

  return (
    <AuthPageShell>
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
