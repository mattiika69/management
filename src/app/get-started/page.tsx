import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { BillingCheckoutButton } from "@/components/billing-checkout-button";
import { createClient } from "@/lib/supabase/server";

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

  const steps = [
    {
      eyebrow: "Step 1",
      title: "Workspace ready",
      body: organization.name,
      status: "Complete",
    },
    {
      eyebrow: "Step 2",
      title: "Billing",
      body: billingComplete
        ? "Billing is complete."
        : "Choose a plan to continue.",
      status: billingComplete ? "Complete" : "Required",
    },
    {
      eyebrow: "Step 3",
      title: "Business profile",
      body: "Add the details that guide your team.",
      status: "Optional",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]"
            >
              HyperOptimal Management
            </Link>
            <h1 className="mt-4 text-4xl font-bold text-[#171717]">
              Get started
            </h1>
            <p className="mt-2 max-w-2xl text-[#5d5d55]">
              Finish onboarding for {organization.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings/team"
              className="border border-[#0f766e] px-4 py-2 text-sm font-semibold text-[#0f766e]"
            >
              Settings
            </Link>
          </div>
        </div>

        {billingStatus === "success" ? (
          <div className="mb-6 border border-[#b7d7cf] bg-[#eef7f5] px-5 py-4 text-sm text-[#0f766e]">
            Billing completed.
          </div>
        ) : null}

        {billingStatus === "cancelled" ? (
          <div className="mb-6 border border-[#eadfd3] bg-white px-5 py-4 text-sm text-[#8a5a2d]">
            Checkout was cancelled. You can continue when ready.
          </div>
        ) : null}

        <div className="grid gap-4">
          {steps.map((step) => (
            <section key={step.title} className="border border-[#d9d7cb] bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7f73]">
                    {step.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#171717]">
                    {step.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d5d55]">
                    {step.body}
                  </p>
                </div>
                <span className="border border-[#d9d7cb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5d5d55]">
                  {step.status}
                </span>
              </div>

              {step.title === "Billing" && !billingComplete ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <BillingCheckoutButton />
                  <Link
                    href="/"
                    className="border border-[#d9d7cb] px-5 py-3 text-sm font-semibold text-[#0f766e] transition hover:bg-[#f8f4ee]"
                  >
                    Skip
                  </Link>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="bg-[#171717] px-5 py-3 text-sm font-semibold text-white"
          >
            Skip
          </Link>
          <Link
            href="/settings/team"
            className="border border-[#d9d7cb] px-5 py-3 text-sm font-semibold text-[#0f766e]"
          >
            Settings
          </Link>
          <Link
            href="/privacy"
            className="border border-[#d9d7cb] px-5 py-3 text-sm font-semibold text-[#0f766e]"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="border border-[#d9d7cb] px-5 py-3 text-sm font-semibold text-[#0f766e]"
          >
            Terms
          </Link>
        </div>
      </section>
    </main>
  );
}
