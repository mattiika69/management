import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "link";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
};

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand-500)] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-[color:var(--color-ink-900)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-[color:var(--color-ink-700)] active:scale-[0.99]",
  secondary:
    "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-900)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-muted)] active:scale-[0.99]",
  ghost:
    "text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-surface-muted)] active:scale-[0.99]",
  outline:
    "border border-[color:var(--color-border-strong)] bg-transparent text-[color:var(--color-ink-900)] hover:bg-[color:var(--color-surface-muted)] active:scale-[0.99]",
  danger:
    "bg-[color:var(--color-danger)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:brightness-95 active:scale-[0.99]",
  link: "text-[color:var(--color-brand-600)] underline-offset-4 hover:underline px-0",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    className = "",
    variant = "primary",
    size = "md",
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <svg
          aria-hidden
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2.5"
            opacity="0.25"
          />
          <path
            d="M21 12a9 9 0 0 1-9 9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </button>
  );
});
