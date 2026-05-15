import { redirect } from "next/navigation";
import { AITrainingList } from "@/components/ai-training-list";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { funnelTabs } from "@/lib/hyperoptimal/navigation";
import { getTrainingRows } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

export default async function BookACallTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/funnels/book-a-call/training");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { definitions, trainingRows } = await getTrainingRows(supabase, organization, "book-a-call");

  return (
    <AppShell
      active="/funnels/book-a-call/training"
      title="Book a Call Training"
      subtitle="Train only the pre-made AIs that support the Book-a-Call Funnel."
      tabs={funnelTabs}
    >
      <AITrainingList definitions={definitions} trainingRows={trainingRows} />
    </AppShell>
  );
}
