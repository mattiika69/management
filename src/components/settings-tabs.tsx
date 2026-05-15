import Link from "next/link";

type SettingsTab = "team" | "billing" | "integrations" | "slack" | "telegram";

export function SettingsTabs({ active }: { active: SettingsTab }) {
  const tabs: Array<{ href: string; label: string; key: SettingsTab }> = [
    { href: "/settings/team", label: "Team", key: "team" },
    { href: "/settings/billing", label: "Billing", key: "billing" },
    { href: "/settings/integrations", label: "Integrations", key: "integrations" },
    { href: "/settings/slack", label: "Slack", key: "slack" },
    { href: "/settings/telegram", label: "Telegram", key: "telegram" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[#d9d7cb]">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`border-x border-t border-[#d9d7cb] px-4 py-2 text-sm font-semibold ${
            active === tab.key
              ? "bg-white text-[#171717]"
              : "bg-[#f8f4ee] text-[#0f766e]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
