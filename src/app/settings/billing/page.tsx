import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BillingCheckoutButton } from "@/components/billing-checkout-button";
import { CreditCheckoutButton } from "@/components/credit-checkout-button";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { getCreditAccount } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/billing");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const creditAccount = await getCreditAccount(supabase, organization).catch(() => null);
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("status,price_id,current_period_end,cancel_at_period_end,created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AppShell
      active="/settings/billing"
      title="Billing"
      subtitle={`Manage billing for ${organization.name}.`}
      tabs={settingsTabs}
    >
      <section className="settings-page">
        <section className="settings-card-pad mt-6">
          <h2 className="text-2xl font-bold text-[#111827]">Workspace Credits</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
            Credits are spent per generated workspace asset.
          </p>
          <div className="mt-4 rounded-md border border-[#d8dee9] bg-[#f8fafc] px-4 py-3 text-sm">
            <span className="font-semibold text-[#111827]">{creditAccount?.balance_credits ?? 0}</span> credits available
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <CreditCheckoutButton pack="starter" />
            <CreditCheckoutButton pack="growth" />
          </div>
        </section>

        <section className="settings-card-pad mt-6">
          <h2 className="text-2xl font-bold text-[#111827]">Subscription</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
            Choose a plan or update the current subscription.
          </p>
          <div className="mt-5">
            <BillingCheckoutButton />
          </div>
        </section>

        <section className="settings-card-pad mt-6">
          <h2 className="text-2xl font-bold text-[#111827]">Subscriptions</h2>
          <div className="mt-4 space-y-3 text-sm">
            {subscriptions?.length ? (
              subscriptions.map((subscription) => (
                <div key={`${subscription.status}-${subscription.created_at}`} className="border border-[#ebe3d8] p-4">
                  <p className="font-semibold text-[#171717]">{subscription.status}</p>
                  <p className="mt-1 text-[#5d5d55]">
                    {subscription.cancel_at_period_end ? "Cancels at period end" : "Renews automatically"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[#5d5d55]">No subscription records yet.</p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
