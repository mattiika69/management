import {
  AdminPageShell,
  AdminSection,
  AdminTable,
  EmptyState,
  TableCell,
  formatDate,
} from "@/components/admin/admin-ui";
import { getAdminUsersData } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminUsersPage() {
  const session = await requireAdmin("/admin/users");
  const users = await getAdminUsersData(session);

  return (
    <AdminPageShell active="/admin/users" title="Users">
      <AdminSection title="Users">
        {users.length ? (
          <AdminTable headers={["Email", "Name", "Role", "Created", "Last Sign In", "Organization", "Subscription"]}>
            {users.map((user) => (
              <tr key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.name || "None"}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>{formatDate(user.lastSignInAt)}</TableCell>
                <TableCell>{user.organization}</TableCell>
                <TableCell>{user.subscriptionStatus}</TableCell>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <EmptyState>No users found.</EmptyState>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}
