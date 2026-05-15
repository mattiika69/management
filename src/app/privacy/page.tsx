import { LegalPageShell } from "@/components/legal-page-shell";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <section>
        <p className="text-sm text-[#8a7f73]">Effective May 15, 2026</p>
        <p className="mt-4">
          HyperOptimal Funnel collects account, workspace, funnel, billing,
          communication, and integration data needed to operate the product.
          We use this data to provide the service, deliver requested
          communications, process billing, and protect customer workspaces.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Data We Process</h2>
        <p className="mt-3">
          We may process names, email addresses, phone numbers, organization
          membership details, funnel records, billing identifiers, message
          content, delivery metadata, and connected account identifiers.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">How We Use Data</h2>
        <p className="mt-3">
          Data is used to provide workspace access, send requested messages,
          synchronize integrations, troubleshoot product issues, and comply
          with operational, security, and billing requirements.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Security</h2>
        <p className="mt-3">
          Product records are protected with workspace access controls,
          operational safeguards, and provider-side security controls.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#171717]">Your Choices</h2>
        <p className="mt-3">
          Users can request access, correction, or deletion of account and
          workspace data where legally and operationally permitted. SMS opt-out
          requests are honored for supported message flows.
        </p>
      </section>
    </LegalPageShell>
  );
}
