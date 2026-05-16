import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InspirationWorkspace } from "@/components/inspiration-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { listCompanyContexts } from "@/lib/hyperoptimal/server";
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
  const contexts = await listCompanyContexts(supabase, organization);

  return (
    <AppShell
      active="/inspiration"
      title="Inspiration"
      subtitle="Save workspace inspiration into Notes."
    >
      <InspirationWorkspace contexts={contexts} funnels={[]} />
    </AppShell>
  );
}
