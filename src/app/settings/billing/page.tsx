import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BillingCheckoutButton } from "@/components/billing-checkout-button";
import { CreditCheckoutButton } from "@/components/credit-checkout-button";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { getCreditAccount } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/billing");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const creditAccount = await getCreditAccount(supabase, organization).catch(
    () => null,
  );
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "status,price_id,current_period_end,cancel_at_period_end,created_at",
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AppShell
      active="/settings/billing"
      title="Settings"
      subtitle={`Billing · ${organization.name}`}
      tabs={settingsTabs}
    >
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1fr_auto] md:items-stretch">
            <div className="p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)]">
                Launch credits
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[44px] font-semibold tabular-nums leading-none tracking-tight text-[color:var(--color-ink-900)]">
                  {creditAccount?.balance_credits ?? 0}
                </span>
                <span className="text-[14px] text-[color:var(--color-ink-500)]">
                  credits available
                </span>
              </div>
              <p className="mt-3 max-w-md text-[13px] text-[color:var(--color-ink-500)]">
                Credits are spent per generated funnel asset. Top up to keep your
                team launching without interruption.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <CreditCheckoutButton pack="starter" />
                <CreditCheckoutButton pack="growth" />
              </div>
            </div>
            <div className="hidden border-l border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-6 md:block">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)]">
                    Tip
                  </div>
                  <p className="mt-2 max-w-[200px] text-[13px] text-[color:var(--color-ink-700)]">
                    Auto-recharge keeps your workspace topped up without manual checkouts.
                  </p>
                </div>
                <div className="text-[11px] text-[color:var(--color-ink-400)]">
                  Need a custom pack? Contact us.
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader
              eyebrow="Subscription"
              title="Plan"
              description="Choose a plan or update the current subscription."
            />
            <CardBody>
              <BillingCheckoutButton />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              eyebrow="History"
              title="Subscription records"
              description="Most recent subscription activity."
            />
            <CardBody>
              {subscriptions?.length ? (
                <div className="space-y-2">
                  {subscriptions.map((subscription) => (
                    <div
                      key={`${subscription.status}-${subscription.created_at}`}
                      className="flex items-center justify-between rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={
                              subscription.status === "active"
                                ? "success"
                                : subscription.status === "trialing"
                                  ? "brand"
                                  : "neutral"
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[12px] text-[color:var(--color-ink-500)]">
                          {subscription.cancel_at_period_end
                            ? "Cancels at period end"
                            : "Renews automatically"}
                        </p>
                      </div>
                      <span className="text-[11px] text-[color:var(--color-ink-400)]">
                        {new Date(subscription.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[color:var(--color-ink-500)]">
                  No subscription records yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
