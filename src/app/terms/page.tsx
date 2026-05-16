import { LegalPageShell } from "@/components/legal-page-shell";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <section>
        <p className="text-sm text-[#8a7f73]">Effective May 15, 2026</p>
        <p className="mt-4">
          These terms govern access to HyperOptimal Management. By creating an
          account or using the product, users agree to use the service lawfully,
          maintain accurate account information, and protect account credentials.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Accounts</h2>
        <p className="mt-3">
          Each user must authenticate before accessing workspace functionality.
          Organizations are responsible for managing their users, data,
          integrations, billing settings, and outbound communications.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Communications</h2>
        <p className="mt-3">
          Users are responsible for ensuring that email, SMS, Slack, Telegram,
          and other communications comply with applicable consent, privacy,
          anti-spam, carrier, and platform rules.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Billing</h2>
        <p className="mt-3">
          Paid features may be billed through our payment processor. Organizations are
          responsible for keeping billing details current and reviewing
          subscription status, invoices, renewals, and cancellations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Acceptable Use</h2>
        <p className="mt-3">
          The product may not be used to send unlawful, abusive, deceptive,
          harmful, or unauthorized communications, or to bypass security,
          consent, rate limit, or workspace access controls.
        </p>
      </section>
    </LegalPageShell>
  );
}
