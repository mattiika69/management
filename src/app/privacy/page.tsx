import { LegalPageShell } from "@/components/legal-page-shell";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
        Effective May 15, 2026
      </p>

      <p>
        HyperOptimal Funnel collects account, workspace, funnel, billing,
        communication, and integration data needed to operate the product. We
        use this data to provide the service, deliver requested communications,
        process billing, and protect customer workspaces.
      </p>

      <h2>Data we process</h2>
      <p>
        We may process names, email addresses, phone numbers, organization
        membership details, funnel records, billing identifiers, message content,
        delivery metadata, and connected account identifiers.
      </p>

      <h2>How we use data</h2>
      <p>
        Data is used to provide workspace access, send requested messages,
        synchronize integrations, troubleshoot product issues, and comply with
        operational, security, and billing requirements.
      </p>

      <h2>Security</h2>
      <p>
        Product records are protected with workspace access controls, operational
        safeguards, and provider-side security controls.
      </p>

      <h2>Your choices</h2>
      <p>
        Users can request access, correction, or deletion of account and workspace
        data where legally and operationally permitted. SMS opt-out requests are
        honored for supported message flows.
      </p>
    </LegalPageShell>
  );
}
