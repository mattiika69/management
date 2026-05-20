import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth-page-shell";
import { SignupForm } from "@/components/signup-form";
import { safeRelativePath } from "@/lib/auth/redirects";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    redirect?: string;
    email?: string;
    billing_claim?: string;
    checkout?: string;
  }>;
}) {
  const {
    next,
    redirect: redirectParam,
    email,
    billing_claim: billingClaim,
    checkout,
  } = await searchParams;
  const requestedNext = safeRelativePath(redirectParam ?? next, "/get-started");
  const inviteNext = requestedNext.startsWith("/invite/");
  const isBillingClaimSignup = Boolean(billingClaim);

  if (isAuthBypassEnabled() && !inviteNext && !isBillingClaimSignup) {
    redirect("/management");
  }

  const safeNext = inviteNext ? requestedNext : "/get-started";

  if (checkout === "success" && !billingClaim) {
    return (
      <AuthPageShell>
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="m5.25 7.25 6.1 5.1a1 1 0 0 0 1.3 0l6.1-5.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">Check your email</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your workspace setup link is on the way. Use that secure link to create your owner account.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Back to Sign In
          </Link>
        </section>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <SignupForm initialEmail={email} next={safeNext} billingClaimToken={billingClaim} />
    </AuthPageShell>
  );
}
