import { LegalPageShell } from "@/components/legal-page-shell";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
        Effective May 15, 2026
      </p>

      <p>
        These terms govern access to HyperOptimal Funnel. By creating an account
        or using the product, users agree to use the service lawfully, maintain
        accurate account information, and protect account credentials.
      </p>

      <h2>Accounts</h2>
      <p>
        Each user must authenticate before accessing workspace functionality.
        Organizations are responsible for managing their users, data, integrations,
        billing settings, and outbound communications.
      </p>

      <h2>Communications</h2>
      <p>
        Users are responsible for ensuring that email, SMS, Slack, Telegram, and
        other communications comply with applicable consent, privacy, anti-spam,
        carrier, and platform rules.
      </p>

      <h2>Billing</h2>
      <p>
        Paid features may be billed through our payment processor. Organizations
        are responsible for keeping billing details current and reviewing
        subscription status, invoices, renewals, and cancellations.
      </p>

      <h2>Acceptable use</h2>
      <p>
        The product may not be used to send unlawful, abusive, deceptive, harmful,
        or unauthorized communications, or to bypass security, consent, rate
        limit, or workspace access controls.
      </p>
    </LegalPageShell>
  );
}
