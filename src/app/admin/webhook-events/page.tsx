import {
  AdminPageShell,
  AdminSection,
  AdminTable,
  EmptyState,
  TableCell,
  formatDate,
} from "@/components/admin/admin-ui";
import { getAdminWebhookEventsData } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminWebhookEventsPage() {
  const session = await requireAdmin("/admin/webhook-events");
  const events = await getAdminWebhookEventsData(session);

  return (
    <AdminPageShell active="/admin/webhook-events" title="Webhook Events">
      <AdminSection title="Webhook Events">
        {events.length ? (
          <AdminTable headers={["Provider", "Event Type", "Status", "Created", "Error"]}>
            {events.map((event) => (
              <tr key={event.id}>
                <TableCell>{event.provider}</TableCell>
                <TableCell>{event.eventType}</TableCell>
                <TableCell>{event.status}</TableCell>
                <TableCell>{formatDate(event.createdAt)}</TableCell>
                <TableCell>{event.errorMessage}</TableCell>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <EmptyState>No webhook events found.</EmptyState>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}
