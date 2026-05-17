import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default function UpdatePasswordPage() {
  if (isAuthBypassEnabled()) {
    redirect("/management");
  }

  return (
    <AuthPageShell>
      <UpdatePasswordForm />
    </AuthPageShell>
  );
}
