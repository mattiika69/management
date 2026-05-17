import {
  AdminPageShell,
  AdminSection,
  AdminTable,
  EmptyState,
  TableCell,
  formatDate,
} from "@/components/admin/admin-ui";
import { getAdminOrgsData } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminOrganizationsPage() {
  const session = await requireAdmin("/admin/orgs");
  const orgs = await getAdminOrgsData(session);

  return (
    <AdminPageShell active="/admin/orgs" title="Organizations">
      <AdminSection title="Organizations">
        {orgs.length ? (
          <AdminTable headers={["Name", "Owner", "Plan", "Created", "Members", "Integrations"]}>
            {orgs.map((org) => (
              <tr key={org.id}>
                <TableCell>{org.name}</TableCell>
                <TableCell>{org.owner}</TableCell>
                <TableCell>{org.plan}</TableCell>
                <TableCell>{formatDate(org.createdAt)}</TableCell>
                <TableCell>{org.memberCount}</TableCell>
                <TableCell>{org.integrationStatus}</TableCell>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <EmptyState>No organizations found.</EmptyState>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}
