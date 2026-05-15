import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LearningList } from "@/components/learning-list";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { funnelTabs } from "@/lib/hyperoptimal/navigation";
import { ensureLearningItems } from "@/lib/hyperoptimal/server";
import { createClient } from "@/lib/supabase/server";

export default async function BookACallLearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/funnels/book-a-call/learning");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const items = await ensureLearningItems(supabase, organization, user, "book-a-call");

  return (
    <AppShell
      active="/funnels/book-a-call/learning"
      title="Book a Call Learning"
      subtitle="Learning and training content for the Book-a-Call Funnel."
      tabs={funnelTabs}
    >
      <LearningList funnelType="book-a-call" items={items} />
    </AppShell>
  );
}
