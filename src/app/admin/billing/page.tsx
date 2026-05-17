import {
  AdminPageShell,
  AdminSection,
  AdminTable,
  EmptyState,
  TableCell,
  formatDate,
} from "@/components/admin/admin-ui";
import { getAdminBillingData } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminBillingPage() {
  const session = await requireAdmin("/admin/billing");
  const billing = await getAdminBillingData(session);

  return (
    <AdminPageShell active="/admin/billing" title="Billing">
      <AdminSection title="Billing">
        {billing.length ? (
          <AdminTable
            headers={[
              "Customer Email",
              "Plan",
              "Status",
              "Current Period End",
              "Stripe Customer ID",
              "Stripe Subscription ID",
              "Source",
            ]}
          >
            {billing.map((row) => (
              <tr key={`${row.source}:${row.id}`}>
                <TableCell>{row.customerEmail}</TableCell>
                <TableCell>{row.plan}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{formatDate(row.currentPeriodEnd)}</TableCell>
                <TableCell>{row.stripeCustomerId}</TableCell>
                <TableCell>{row.stripeSubscriptionId}</TableCell>
                <TableCell>{row.source}</TableCell>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <EmptyState>No billing records found.</EmptyState>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}
