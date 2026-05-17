import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  AgentRequestWorkspace,
  type AgentRequestView,
} from "@/components/agent-request-workspace";
import { LearningsWorkspace } from "@/components/learnings-workspace";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { getLearningItems } from "@/lib/learnings/server";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

type AgentAction = {
  id: string;
  action_type: string;
  status: string;
  created_at: string;
};

type AgentDeployment = {
  id: string;
  provider: string;
  status: string;
  deployment_url: string | null;
  github_commit_sha: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized === "completed" || normalized === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "failed" || normalized === "cancelled"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-[#d9e1ee] bg-[#f8fafc] text-[#667085]";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${tone}`}>
      {value}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[6px] border border-dashed border-[#d9e1ee] bg-[#f8fafc] px-4 py-8 text-center text-[13px] font-medium text-[#667085]">
      {label}
    </div>
  );
}

export default async function AgentSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/agent");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const role = await getMembershipRole(supabase, organization.id, user);

  if (!canManageTeam(role)) {
    redirect("/settings/team");
  }

  const [requestsResult, actionsResult, deploymentsResult, learnings] = await Promise.all([
    supabase
      .from("agent_requests")
      .select("id,request_text,source_provider,risk_level,status,created_at")
      .eq("tenant_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AgentRequestView[]>(),
    supabase
      .from("agent_actions")
      .select("id,action_type,status,created_at")
      .eq("tenant_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AgentAction[]>(),
    supabase
      .from("agent_deployments")
      .select("id,provider,status,deployment_url,github_commit_sha,created_at")
      .eq("tenant_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AgentDeployment[]>(),
    getLearningItems(supabase, organization, 100),
  ]);

  if (requestsResult.error) throw new Error(requestsResult.error.message);
  if (actionsResult.error) throw new Error(actionsResult.error.message);
  if (deploymentsResult.error) throw new Error(deploymentsResult.error.message);

  const requests = requestsResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const deployments = deploymentsResult.data ?? [];

  return (
    <AppShell
      active="/settings/agent"
      title="AI Agent"
      subtitle="Review workspace AI agent activity."
      tabs={settingsTabs}
    >
      <section className="settings-page space-y-6">
        <section className="settings-card-pad">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold text-[#101828]">AI Agent</h2>
              <p className="mt-2 max-w-2xl text-[13px] font-medium leading-6 text-[#667085]">
                Track requests, actions, and deployments started from approved workspace workflows.
              </p>
            </div>
            <span className="rounded-[5px] border border-[#d9e1ee] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#667085]">
              Your role: {role}
            </span>
          </div>
        </section>

        <AgentRequestWorkspace initialRequests={requests} />

        <section className="space-y-4">
          <div className="mb-5">
            <h2 className="text-[15px] font-bold text-[#101828]">AI Agent memory</h2>
            <p className="mt-2 text-[13px] font-medium leading-6 text-[#667085]">
              Add, edit, and delete the learnings used by the AI Agent.
            </p>
          </div>
          <LearningsWorkspace initialItems={learnings} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr]">
          <div className="settings-card-pad">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-[#101828]">Recent actions</h2>
              <span className="text-[12px] font-semibold text-[#667085]">{actions.length}</span>
            </div>
            {actions.length ? (
              <div className="space-y-3">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between gap-4 rounded-[7px] border border-[#d9e1ee] bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-[#101828]">{action.action_type}</p>
                      <p className="mt-1 text-[12px] font-medium text-[#667085]">{formatDate(action.created_at)}</p>
                    </div>
                    <StatusBadge value={action.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No agent actions yet." />
            )}
          </div>
        </section>

        <section className="settings-card-pad">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-[#101828]">Deployments</h2>
            <span className="text-[12px] font-semibold text-[#667085]">{deployments.length}</span>
          </div>
          {deployments.length ? (
            <div className="overflow-hidden rounded-[6px] border border-[#d9e1ee]">
              <div className="settings-table-head hidden grid-cols-[1fr_120px_180px_160px] gap-3 px-4 py-3 md:grid">
                <span>Provider</span>
                <span>Status</span>
                <span>Commit</span>
                <span>Created</span>
              </div>
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="grid gap-2 border-t border-[#e4e7ec] px-4 py-4 text-[13px] md:grid-cols-[1fr_120px_180px_160px] md:gap-3"
                >
                  <span className="min-w-0 truncate font-semibold capitalize text-[#101828]">
                    {deployment.deployment_url ? (
                      <a href={deployment.deployment_url} className="text-[#155eef] hover:underline">
                        {deployment.provider}
                      </a>
                    ) : (
                      deployment.provider
                    )}
                  </span>
                  <span><StatusBadge value={deployment.status} /></span>
                  <span className="truncate text-[#667085]">{deployment.github_commit_sha ?? "-"}</span>
                  <span className="text-[#667085]">{formatDate(deployment.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No agent deployments yet." />
          )}
        </section>
      </section>
    </AppShell>
  );
}
