import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InspirationWorkspace } from "@/components/inspiration-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { listCompanyContexts, listFunnels } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

export default async function InspirationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/inspiration");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const [contexts, funnels] = await Promise.all([
    listCompanyContexts(supabase, organization),
    listFunnels(supabase, organization, "book-a-call"),
  ]);

  return (
    <AppShell
      active="/inspiration"
      title="Inspiration"
      subtitle="Save funnel inspiration into Notes for future launches."
    >
      <InspirationWorkspace contexts={contexts} funnels={funnels} />
    </AppShell>
  );
}
