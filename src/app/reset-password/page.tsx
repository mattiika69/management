import { AuthPageShell } from "@/components/auth-page-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <UpdatePasswordForm />
    </AuthPageShell>
  );
}
