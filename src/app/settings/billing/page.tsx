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
        <div className="settings-title-rule">
          <h2 className="text-lg font-bold text-[#101828]">Billing</h2>
        </div>

        <div className="mb-6 inline-flex rounded-[7px] border border-[#d9e1ee] bg-white p-1">
          {["Subscription", "Seats", "Credits"].map((tab, index) => (
            <span
              key={tab}
              className={`inline-flex h-8 items-center rounded-[6px] px-4 text-[11px] font-bold ${
                index === 0 ? "bg-[#101828] text-white" : "text-[#475467]"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        <section className="space-y-6">
          <p className="text-[15px] font-medium leading-6 text-[#53627a]">
            Start a bundle-10 subscription. Base plan includes 10 seats; additional seats are billed per seat.
          </p>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#344054]">Billing Period</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[8px] border border-[#155dfc] bg-[#eff6ff] px-5 py-4 text-center">
                <p className="text-[15px] font-semibold text-[#101828]">Monthly</p>
                <p className="mt-1 text-[12px] font-medium text-[#667085]">$1.00/mo (10 seats included)</p>
                <p className="mt-1 text-[10px] font-medium text-[#98a2b3]">+$0.00/mo per extra seat</p>
              </div>
              <div className="rounded-[8px] border border-[#d9e1ee] bg-white px-5 py-4 text-center">
                <p className="text-[15px] font-semibold text-[#101828]">Annual</p>
                <p className="mt-1 text-[12px] font-medium text-[#667085]">$10.00/yr (10 seats included)</p>
                <p className="mt-1 text-[10px] font-medium text-[#98a2b3]">+$0.00/yr per extra seat</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#344054]">Entitled Seats</p>
            <div className="flex items-center gap-3">
              <button type="button" className="settings-button-outline h-9 w-9 px-0">-</button>
              <div className="settings-field grid w-[72px] place-items-center">10</div>
              <button type="button" className="settings-button-outline h-9 w-9 px-0">+</button>
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#98a2b3]">Seat count is capped at 10 during beta.</p>
          </div>

          <div className="rounded-[8px] bg-white px-4 py-4">
            <div className="flex items-center justify-between border-b border-[#e4e7ec] pb-3 text-[13px] font-medium text-[#344054]">
              <span>Base (10 seats included)</span>
              <span>$1.00</span>
            </div>
            <div className="flex items-center justify-between pt-3 text-[15px] font-semibold text-[#101828]">
              <span>Total (10 seats)</span>
              <span>$1.00 / mo</span>
            </div>
          </div>

          <div>
            <BillingCheckoutButton />
          </div>
        </section>

        <section className="settings-card-pad mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold text-[#101828]">Workspace Credits</h2>
              <p className="mt-1 text-[13px] font-medium text-[#667085]">
                Credits are spent per generated workspace asset.
              </p>
            </div>
            <div className="rounded-[7px] border border-[#d9e1ee] bg-[#f8fafc] px-4 py-2 text-[13px]">
              <span className="font-bold text-[#101828]">{creditAccount?.balance_credits ?? 0}</span> credits available
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <CreditCheckoutButton pack="starter" />
            <CreditCheckoutButton pack="growth" />
          </div>
        </section>

        <section className="settings-card-pad mt-6">
          <h2 className="text-[18px] font-bold text-[#101828]">Subscriptions</h2>
          <div className="mt-4 space-y-3 text-sm">
            {subscriptions?.length ? (
              subscriptions.map((subscription) => (
                <div key={`${subscription.status}-${subscription.created_at}`} className="rounded-[7px] border border-[#d9e1ee] p-4">
                  <p className="font-semibold text-[#171717]">{subscription.status}</p>
                  <p className="mt-1 text-[#667085]">
                    {subscription.cancel_at_period_end ? "Cancels at period end" : "Renews automatically"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[#667085]">No subscription records yet.</p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
