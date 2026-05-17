import {
  AdminPageShell,
  AdminSection,
  AdminTable,
  EmptyState,
  StatCard,
  TableCell,
  formatDate,
} from "@/components/admin/admin-ui";
import { getAdminOverviewData } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminPage() {
  const session = await requireAdmin("/admin");
  const data = await getAdminOverviewData(session);

  return (
    <AdminPageShell active="/admin" title="Overview">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={data.totals.users} />
        <StatCard label="Organizations" value={data.totals.organizations} />
        <StatCard label="Active Subscriptions" value={data.totals.activeSubscriptions} />
        <StatCard label="Audit Events" value={data.totals.auditEvents} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Recent Signups">
          {data.recentSignups.length ? (
            <AdminTable headers={["Email", "Name", "Created"]}>
              {data.recentSignups.map((signup) => (
                <tr key={signup.id}>
                  <TableCell>{signup.email}</TableCell>
                  <TableCell>{signup.name}</TableCell>
                  <TableCell>{formatDate(signup.createdAt)}</TableCell>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <EmptyState>No recent signups.</EmptyState>
          )}
        </AdminSection>

        <AdminSection title="Recent Webhook Events">
          {data.recentWebhookEvents.length ? (
            <AdminTable headers={["Provider", "Event", "Status", "Created"]}>
              {data.recentWebhookEvents.map((event) => (
                <tr key={event.id}>
                  <TableCell>{event.provider}</TableCell>
                  <TableCell>{event.eventType}</TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell>{formatDate(event.createdAt)}</TableCell>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <EmptyState>No webhook events.</EmptyState>
          )}
        </AdminSection>

        <AdminSection title="Recent Audit Log Events">
          {data.recentAuditLogs.length ? (
            <AdminTable headers={["Actor", "Action", "Target", "Created"]}>
              {data.recentAuditLogs.map((event) => (
                <tr key={event.id}>
                  <TableCell>{event.actor}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell>{event.target}</TableCell>
                  <TableCell>{formatDate(event.createdAt)}</TableCell>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <EmptyState>No audit log events.</EmptyState>
          )}
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}
