import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const baseField =
  "block w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors duration-150 focus:border-[color:var(--color-brand-500)] focus:outline-none focus:ring-4 focus:ring-[color:var(--color-ring)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:opacity-70";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`${baseField} h-10 px-3.5 text-sm ${className}`}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`${baseField} resize-y px-3.5 py-2.5 text-sm leading-6 ${className}`}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={`${baseField} h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22><path d=%22M3 4.5L6 7.5L9 4.5%22 stroke=%22%235f5f5a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pl-3.5 pr-9 text-sm ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  hint,
  error,
  children,
  required,
  className = "",
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="mb-1.5 block text-[13px] font-medium text-[color:var(--color-ink-700)]">
          {label}
          {required ? <span className="ml-0.5 text-[color:var(--color-danger)]">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-[color:var(--color-danger)]">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-[color:var(--color-ink-400)]">{hint}</span>
      ) : null}
    </label>
  );
}
