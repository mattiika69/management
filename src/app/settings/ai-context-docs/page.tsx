import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ContextWorkspace } from "@/components/context-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { getOrCreateCompanyContext, listCompanyContexts } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ context?: string | string[] }>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AIContextDocsSettingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/ai-context-docs");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const params = searchParams ? await searchParams : {};
  const requestedContextId = readParam(params.context);
  const fallbackContext = await getOrCreateCompanyContext(supabase, organization, user, requestedContextId);
  const contexts = await listCompanyContexts(supabase, organization);
  const activeContext = contexts.find((context) => context.id === requestedContextId) ?? fallbackContext;

  return (
    <AppShell
      active="/settings/ai-context-docs"
      title="AI Context"
      subtitle="The business profile used across Management."
      tabs={settingsTabs}
    >
      <ContextWorkspace contexts={contexts.length ? contexts : [activeContext]} activeContext={activeContext} />
    </AppShell>
  );
}
