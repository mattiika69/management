import {
  AdminPageShell,
  AdminSection,
  AdminTable,
  EmptyState,
  TableCell,
  formatDate,
} from "@/components/admin/admin-ui";
import { getAdminAuditLogsData } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminAuditLogsPage() {
  const session = await requireAdmin("/admin/audit-logs");
  const logs = await getAdminAuditLogsData(session);

  return (
    <AdminPageShell active="/admin/audit-logs" title="Audit Logs">
      <AdminSection title="Audit Logs">
        {logs.length ? (
          <AdminTable headers={["Actor", "Action", "Target", "Created", "Metadata"]}>
            {logs.map((log) => (
              <tr key={log.id}>
                <TableCell>{log.actor}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.target}</TableCell>
                <TableCell>{formatDate(log.createdAt)}</TableCell>
                <TableCell>{log.metadataPreview}</TableCell>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <EmptyState>No audit log events found.</EmptyState>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}
