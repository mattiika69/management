import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function countRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  organizationId: string,
) {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return count ?? 0;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  const [leadCount, emailCount, smsCount, integrationMessageCount] =
    await Promise.all([
      countRows(supabase, "leads", organization.id),
      countRows(supabase, "email_messages", organization.id),
      countRows(supabase, "sms_messages", organization.id),
      countRows(supabase, "integration_messages", organization.id),
    ]);

  const integrations = [
    { name: "Stripe", configured: Boolean(process.env.STRIPE_SECRET_KEY) },
    { name: "Resend", configured: Boolean(process.env.RESEND_API_KEY) },
    { name: "Roezan", configured: Boolean(process.env.ROEZAN_API_KEY) },
    { name: "Slack", configured: Boolean(process.env.SLACK_BOT_TOKEN) },
    { name: "Telegram", configured: Boolean(process.env.TELEGRAM_BOT_TOKEN) },
  ];

  const stats = [
    { label: "Leads", value: leadCount, icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 11l-3-3 M22 8l-3 3" },
    { label: "Emails", value: emailCount, icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
    { label: "SMS", value: smsCount, icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
    { label: "Integration messages", value: integrationMessageCount, icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
  ];

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--color-ink-900)]">
                <span className="text-[10px] font-bold text-white">H</span>
              </div>
              HyperOptimal
            </Link>
            <h1 className="mt-4 text-[36px] font-semibold leading-tight tracking-tight text-[color:var(--color-ink-900)]">
              Admin
            </h1>
            <p className="mt-1 text-[14px] text-[color:var(--color-ink-500)]">
              Account, workspace, billing, and integration readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-[13px] font-medium text-[color:var(--color-ink-900)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
            >
              Back to app
            </Link>
            <Link
              href="/settings/team"
              className="inline-flex h-9 items-center rounded-lg bg-[color:var(--color-ink-900)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--color-ink-700)]"
            >
              Settings
            </Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-[color:var(--color-ink-400)]">
                  {stat.label}
                </p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-500)]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className="mt-3 text-[32px] font-semibold tabular-nums tracking-tight text-[color:var(--color-ink-900)]">
                {stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader eyebrow="Workspace" title="Identity" />
            <CardBody>
              <dl className="grid gap-4 text-[14px]">
                <div className="grid gap-1">
                  <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">Organization</dt>
                  <dd className="text-[color:var(--color-ink-900)]">{organization.name}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">Slug</dt>
                  <dd className="font-mono text-[13px] text-[color:var(--color-ink-700)]">{organization.slug}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">Your role</dt>
                  <dd className="text-[color:var(--color-ink-900)] capitalize">{membership?.role ?? "member"}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">Account email</dt>
                  <dd className="text-[color:var(--color-ink-900)]">{user.email}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              eyebrow="Integrations"
              title="Readiness"
              description="Secrets configured for each provider."
            />
            <CardBody>
              <div className="space-y-2">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3.5 py-2.5"
                  >
                    <span className="text-[13px] font-medium text-[color:var(--color-ink-900)]">
                      {integration.name}
                    </span>
                    <Badge tone={integration.configured ? "success" : "warning"}>
                      {integration.configured ? "Configured" : "Needs secret"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader
            eyebrow="Routes"
            title="Required pages"
            description="Quick links to required pages for compliance."
          />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {[
                ["/login", "Login"],
                ["/signup", "Signup"],
                ["/get-started", "Get started"],
                ["/settings/team", "Settings team"],
                ["/reset-password", "Reset password"],
                ["/privacy", "Privacy policy"],
                ["/terms", "Terms of service"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex h-8 items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-[12px] font-medium text-[color:var(--color-ink-700)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-ink-900)]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
