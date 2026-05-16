import Link from "next/link";

export function OperationsTabs({
  tabs,
  active,
}: {
  tabs: Array<{ id: string; label: string; href: string }>;
  active: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={active === tab.id ? "sm-tab-active" : "sm-tab-inactive"}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
