import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LearningsWorkspace } from "@/components/learnings-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getLearningItems } from "@/lib/learnings/server";
import { createClient } from "@/lib/supabase/server";

export default async function LearnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/learn");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const learningItems = await getLearningItems(supabase, organization);

  return (
    <AppShell
      active="/learn"
      title="Learning"
      subtitle="Reusable feedback and operating lessons."
    >
      <LearningsWorkspace initialItems={learningItems} />
    </AppShell>
  );
}
