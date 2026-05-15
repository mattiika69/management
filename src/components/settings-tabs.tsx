import Link from "next/link";

type SettingsTab =
  | "account"
  | "team"
  | "billing"
  | "integrations"
  | "slack"
  | "telegram"
  | "scheduling";

export function SettingsTabs({ active }: { active: SettingsTab }) {
  const tabs: Array<{ href: string; label: string; key: SettingsTab }> = [
    { href: "/settings/account", label: "Account", key: "account" },
    { href: "/settings/team", label: "Team", key: "team" },
    { href: "/settings/billing", label: "Billing", key: "billing" },
    { href: "/settings/integrations", label: "Integrations", key: "integrations" },
    { href: "/settings/scheduling", label: "Scheduling", key: "scheduling" },
    { href: "/settings/slack", label: "Slack", key: "slack" },
    { href: "/settings/telegram", label: "Telegram", key: "telegram" },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-0 border-b border-[color:var(--color-border)]">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`relative inline-flex h-10 items-center whitespace-nowrap px-4 text-[13px] font-medium transition-colors ${
              isActive
                ? "text-[color:var(--color-ink-900)]"
                : "text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
            }`}
          >
            {tab.label}
            {isActive ? (
              <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-[color:var(--color-ink-900)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
