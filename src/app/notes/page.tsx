import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NotesWorkspace } from "@/components/notes-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { storageTabs } from "@/lib/hyperoptimal/navigation";
import { listCompanyContexts, listFunnels } from "@/lib/hyperoptimal/server";
import { getWorkspaceNotes } from "@/lib/notes/server";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ note?: string | string[] }>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notes");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const params = searchParams ? await searchParams : {};
  const [notes, contexts, funnels] = await Promise.all([
    getWorkspaceNotes(supabase, organization),
    listCompanyContexts(supabase, organization),
    listFunnels(supabase, organization, "book-a-call"),
  ]);

  return (
    <AppShell
      active="/notes"
      title="Notes"
      subtitle="Capture funnel ideas, channel messages, and working references."
      tabs={storageTabs}
    >
      <NotesWorkspace
        initialNotes={notes}
        initialSelectedNoteId={readParam(params.note)}
        contexts={contexts}
        funnels={funnels}
      />
    </AppShell>
  );
}
