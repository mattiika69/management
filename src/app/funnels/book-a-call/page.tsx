import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookACallLaunchWorkspace } from "@/components/book-a-call-launch-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { funnelTabs } from "@/lib/hyperoptimal/navigation";
import {
  getCreditAccount,
  getFunnelById,
  getOrCreateFunnel,
  listCompanyContexts,
  listFunnels,
  ensureFunnelSteps,
} from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ funnel?: string | string[] }>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookACallFunnelPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/funnels/book-a-call");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const params = searchParams ? await searchParams : {};
  const requestedFunnelId = readParam(params.funnel);
  const fallback = await getOrCreateFunnel(supabase, organization, user, "book-a-call");
  const requested = requestedFunnelId
    ? await getFunnelById(supabase, organization, requestedFunnelId)
    : null;
  const activeFunnel = requested ?? fallback.funnel;
  const [funnels, contexts, creditAccount, steps] = await Promise.all([
    listFunnels(supabase, organization, "book-a-call"),
    listCompanyContexts(supabase, organization),
    getCreditAccount(supabase, organization),
    ensureFunnelSteps(supabase, organization.id, activeFunnel.id, "book-a-call"),
  ]);

  return (
    <AppShell
      active="/funnels/book-a-call"
      title="Book a Call Funnel"
      subtitle="Only the booked-call execution path: opt-in, VSL, call preparation, sales call planning, and follow-up."
      tabs={funnelTabs}
    >
      <BookACallLaunchWorkspace
        funnels={funnels.length ? funnels : [activeFunnel]}
        activeFunnel={activeFunnel}
        steps={steps}
        contexts={contexts}
        creditAccount={creditAccount}
      />
    </AppShell>
  );
}
