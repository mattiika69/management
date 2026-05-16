import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]"
            >
              HyperOptimal Funnel
            </Link>
            <h1 className="mt-4 text-4xl font-bold text-[#171717]">Admin</h1>
            <p className="mt-2 text-[#5d5d55]">
              Account, workspace, billing, and integration readiness.
            </p>
          </div>
          <Link
            href="/"
            className="border border-[#0f766e] px-4 py-2 text-sm font-semibold text-[#0f766e]"
          >
            Back to app
          </Link>
          <Link
            href="/settings/team"
            className="bg-[#171717] px-4 py-2 text-sm font-semibold text-white"
          >
            Settings
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Leads", leadCount],
            ["Emails", emailCount],
            ["SMS", smsCount],
            ["Integration messages", integrationMessageCount],
          ].map(([label, value]) => (
            <div key={label} className="border border-[#d9d7cb] bg-white p-5">
              <p className="text-sm text-[#8a7f73]">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-[#171717]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="border border-[#d9d7cb] bg-white p-6">
            <h2 className="text-2xl font-semibold text-[#171717]">Workspace</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-[#8a7f73]">Organization</dt>
                <dd className="mt-1 text-[#171717]">{organization.name}</dd>
              </div>
              <div>
                <dt className="text-[#8a7f73]">Slug</dt>
                <dd className="mt-1 text-[#171717]">{organization.slug}</dd>
              </div>
              <div>
                <dt className="text-[#8a7f73]">Your role</dt>
                <dd className="mt-1 text-[#171717]">{membership?.role ?? "member"}</dd>
              </div>
              <div>
                <dt className="text-[#8a7f73]">Account email</dt>
                <dd className="mt-1 text-[#171717]">{user.email}</dd>
              </div>
            </dl>
          </section>

          <section className="border border-[#d9d7cb] bg-white p-6">
            <h2 className="text-2xl font-semibold text-[#171717]">Integrations</h2>
            <div className="mt-5 space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center justify-between border border-[#ebe3d8] px-4 py-3 text-sm"
                >
                  <span className="font-medium text-[#171717]">{integration.name}</span>
                  <span
                    className={
                      integration.configured ? "text-[#0f766e]" : "text-[#8a7f73]"
                    }
                  >
                    {integration.configured ? "Configured" : "Needs secret"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-[#d9d7cb] bg-white p-6">
          <h2 className="text-2xl font-semibold text-[#171717]">Required Pages</h2>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
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
                className="border border-[#d9d7cb] px-4 py-2 text-[#0f766e]"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
