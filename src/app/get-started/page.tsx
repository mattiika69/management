import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { BillingCheckoutButton } from "@/components/billing-checkout-button";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

type SearchParams = Promise<{
  billing?: string | string[];
}>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/get-started");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const params = searchParams ? await searchParams : {};
  const billingStatus = readParam(params.billing);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string }>();

  const billingComplete =
    billingStatus === "success" ||
    ["active", "trialing"].includes(subscription?.status ?? "");

  type Step = {
    number: number;
    title: string;
    body: string;
    status: "complete" | "required" | "optional";
  };

  const steps: Step[] = [
    {
      number: 1,
      title: "Workspace ready",
      body: organization.name,
      status: "complete",
    },
    {
      number: 2,
      title: "Billing",
      body: billingComplete ? "Billing is complete." : "Choose a plan to continue.",
      status: billingComplete ? "complete" : "required",
    },
    {
      number: 3,
      title: "Business profile",
      body: "Add the details that guide your funnel setup.",
      status: "optional",
    },
  ];

  const completedCount = steps.filter((step) => step.status === "complete").length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <header className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--color-ink-900)]">
              <span className="text-[10px] font-bold text-white">H</span>
            </div>
            HyperOptimal
          </Link>
          <h1 className="mt-6 text-[36px] font-semibold leading-tight tracking-tight text-[color:var(--color-ink-900)]">
            Welcome — let&apos;s set things up.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-7 text-[color:var(--color-ink-500)]">
            A few quick steps to finish your workspace for {organization.name}.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-[color:var(--color-surface-muted)] ring-1 ring-[color:var(--color-border)]">
              <div
                className="h-full rounded-full bg-[color:var(--color-brand-500)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[12px] font-medium tabular-nums text-[color:var(--color-ink-500)]">
              {completedCount} of {steps.length} complete
            </span>
          </div>
        </header>

        {billingStatus === "success" ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Billing completed.
          </div>
        ) : null}

        {billingStatus === "cancelled" ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
            Checkout was cancelled. You can continue when ready.
          </div>
        ) : null}

        <ol className="space-y-3">
          {steps.map((step) => (
            <li
              key={step.title}
              className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ${
                      step.status === "complete"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : step.status === "required"
                          ? "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] ring-1 ring-[color:var(--color-brand-100)]"
                          : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-500)] ring-1 ring-[color:var(--color-border)]"
                    }`}
                  >
                    {step.status === "complete" ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
                      {step.title}
                    </h2>
                    <p className="mt-1 max-w-md text-[14px] leading-6 text-[color:var(--color-ink-500)]">
                      {step.body}
                    </p>
                  </div>
                </div>
                <Badge
                  tone={
                    step.status === "complete"
                      ? "success"
                      : step.status === "required"
                        ? "brand"
                        : "neutral"
                  }
                >
                  {step.status === "complete"
                    ? "Complete"
                    : step.status === "required"
                      ? "Required"
                      : "Optional"}
                </Badge>
              </div>

              {step.title === "Billing" && !billingComplete ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <BillingCheckoutButton />
                  <Link
                    href="/"
                    className="inline-flex h-10 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-[13px] font-medium text-[color:var(--color-ink-700)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
                  >
                    Skip for now
                  </Link>
                </div>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[color:var(--color-ink-900)] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--color-ink-700)]"
          >
            Enter workspace
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link
            href="/settings/team"
            className="text-[13px] font-medium text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
          >
            Settings
          </Link>
          <Link
            href="/privacy"
            className="text-[13px] font-medium text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-[13px] font-medium text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
          >
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}
