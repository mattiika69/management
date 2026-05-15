import { HTMLAttributes, ReactNode } from "react";

export function Card({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  eyebrow,
  actions,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-4 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
            {title}
          </h3>
        ) : null}
        {description ? (
          <p className="mt-1 text-[13px] text-[color:var(--color-ink-500)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-5 py-3 rounded-b-xl ${className}`}
    >
      {children}
    </div>
  );
}
