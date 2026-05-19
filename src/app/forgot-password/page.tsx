import { AuthPageShell } from "@/components/auth-page-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthPageShell>
      <ResetPasswordForm initialEmail={email} />
    </AuthPageShell>
  );
}
