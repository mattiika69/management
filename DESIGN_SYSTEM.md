# Design System

A complete, self-contained spec for the "Modern SaaS" visual language used across HyperOptimal apps. Drop this into any Next.js + Tailwind v4 codebase and you'll get the same look.

This is a working manual, not a museum piece. Every value, class, and pattern below is in use — copy what you need.

---

## 0. Philosophy

The system has one job: feel like a serious, modern SaaS product (Linear, Vercel, Stripe, Notion) without inventing anything novel. Three rules govern everything:

1. **Quiet by default, expressive on purpose.** The page is mostly white/off-white with hairline borders. Color, shadow, and motion are reserved for things the user should actually notice (active nav, primary action, focused input, success state).
2. **One scale, repeated everywhere.** One radius scale, one spacing scale, one shadow scale, one type scale, one neutral ramp, one accent. No bespoke pixel values per page. If you find yourself reaching for `text-[#3a3a3a]`, you're off-system.
3. **Composition over configuration.** Every page is built from the same ~8 primitives (Button, Input, Field, Select, Textarea, Card, Badge) and ~4 layout shells (AppShell, AppSidebar, AuthPageShell, LegalPageShell). New pages should not introduce new components — they assemble existing ones.

If you can't tell whether a choice is on-system, ask: "Would Linear, Vercel, or Stripe do this?" If no, don't do it.

---

## 1. Tech stack assumptions

- **Next.js 15+** (App Router) with `"use client"` where state is needed.
- **Tailwind CSS v4** using the `@theme` directive in CSS. No `tailwind.config.js`.
- **PostCSS** with `@tailwindcss/postcss`.
- **Fonts**: `Inter` from `next/font/google`, exposed as the `--font-inter` CSS variable. Use `font-feature-settings: "cv11", "ss01", "ss03"` for the polished Inter look.
- **Icons**: inline SVG, line style, `stroke-width="1.75"` for nav/UI and `"2"` for emphasis. No icon library.

### Root layout

```tsx
// src/app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

---

## 2. Design tokens

All tokens live in `src/app/globals.css` inside `@theme { ... }`. Tailwind v4 picks them up automatically and exposes them as utility classes (`bg-bg`, `text-ink-900`, `shadow-card`, etc.) **and** as CSS custom properties (`var(--color-ink-900)`).

> **Convention**: in components, prefer `bg-[color:var(--color-ink-900)]` over `bg-ink-900`. The explicit form makes it obvious which token you're touching and works without Tailwind IntelliSense.

### 2.1 Colors

#### Neutral surfaces (warm-tinted grayscale)

| Token                    | Hex       | Use                                                |
| ------------------------ | --------- | -------------------------------------------------- |
| `--color-bg`             | `#fafaf9` | Page background. Slightly warm off-white.          |
| `--color-surface`        | `#ffffff` | Cards, panels, primary surfaces.                   |
| `--color-surface-muted`  | `#f7f7f5` | Sidebar, table header, sub-panels, hover states.   |
| `--color-surface-sunken` | `#f3f3f1` | Pressed states, deepest recess.                    |
| `--color-border`         | `#e7e7e3` | Default hairline border. Use everywhere.           |
| `--color-border-strong`  | `#d8d8d2` | Hover state for borders, slightly more emphasis.   |
| `--color-ring`           | `rgba(21,93,252,0.18)` | Focus ring (4px around inputs/buttons). |

#### Ink (text)

| Token              | Hex       | Use                                          |
| ------------------ | --------- | -------------------------------------------- |
| `--color-ink-900`  | `#0a0a0a` | Primary text, headings, primary button bg.   |
| `--color-ink-700`  | `#2a2a28` | Secondary text, hover for primary button.    |
| `--color-ink-500`  | `#5f5f5a` | Muted text, descriptions, labels.            |
| `--color-ink-400`  | `#82827b` | Subtle text, metadata, eyebrows.             |
| `--color-ink-300`  | `#a8a8a1` | Placeholders, very subtle.                   |
| `--color-ink-200`  | `#c9c9c2` | Disabled text.                               |

#### Brand (accent — primary blue)

| Token               | Hex       | Use                                       |
| ------------------- | --------- | ----------------------------------------- |
| `--color-brand-50`  | `#eff4ff` | Subtle backgrounds (selected items).      |
| `--color-brand-100` | `#d8e4ff` | Borders for brand surfaces.               |
| `--color-brand-200` | `#b2c8ff` | Brand button border.                      |
| `--color-brand-300` | `#82a4ff` | (Reserved)                                |
| `--color-brand-400` | `#5180fb` | (Reserved)                                |
| `--color-brand-500` | `#155dfc` | Primary brand. Accent bars, focus ring.   |
| `--color-brand-600` | `#0f4ad6` | Links, hover state for brand.             |
| `--color-brand-700` | `#0c3ba8` | Text on brand surfaces.                   |
| `--color-brand-800` | `#0a2f82` | (Reserved)                                |
| `--color-brand-900` | `#07215c` | Deepest brand, rare.                      |

#### Status

| Token                     | Hex       | Use                          |
| ------------------------- | --------- | ---------------------------- |
| `--color-success`         | `#10b981` | Success icons, indicators.   |
| `--color-success-soft`    | `#ecfdf5` | Success banner background.   |
| `--color-warning`         | `#f59e0b` | Warning icons.               |
| `--color-warning-soft`    | `#fffbeb` | Warning banner background.   |
| `--color-danger`          | `#ef4444` | Danger button, error text.   |
| `--color-danger-soft`     | `#fef2f2` | Error banner background.     |

For badges, prefer Tailwind's own scales: `emerald-50/200/700`, `amber-50/200/700`, `red-50/200/700`. They match the soft tones above.

### 2.2 Typography

**Family**: Inter, system fallback. Always `font-feature-settings: "cv11", "ss01", "ss03"` and `-webkit-font-smoothing: antialiased`.

**Headings** (`h1`-`h4`) always use `letter-spacing: -0.02em` (tight tracking). Apply globally in `globals.css`.

#### Type scale

| Role                | Size / line-height        | Weight       | Tracking      | Tailwind classes                                    |
| ------------------- | ------------------------- | ------------ | ------------- | --------------------------------------------------- |
| Display (auth hero) | `44px / 1.05`             | 600          | tight (`-2%`) | `text-[44px] font-semibold leading-[1.05] tracking-tight` |
| Page H1             | `28px / tight`            | 600          | tight         | `text-[28px] font-semibold leading-tight tracking-tight` |
| Section H2          | `18px`                    | 600          | tight         | `text-[18px] font-semibold tracking-tight`          |
| Card title          | `15px–16px`               | 600          | tight         | `text-[15px] font-semibold tracking-tight`          |
| Body                | `14px / 1.5`              | 400          | normal        | `text-[14px]` or just `text-sm`                     |
| Small / table       | `13px`                    | 400 / 500    | normal        | `text-[13px]`                                       |
| Micro / meta        | `12px`                    | 400 / 500    | normal        | `text-[12px]`                                       |
| Eyebrow             | `11px UPPERCASE`          | 600          | `0.14em`      | `text-[11px] font-semibold uppercase tracking-[0.14em]` |
| Numeric (stats)     | `32px–44px`               | 600          | tight         | `text-[32px] font-semibold tabular-nums tracking-tight` |

**Eyebrow** is the small uppercase label that sits above a section title. Always use `text-[color:var(--color-ink-400)]` for color.

**Tabular numerals**: any number that lines up in a column or shows a count must use `tabular-nums`.

### 2.3 Spacing

Use Tailwind's default 4/8 scale (`1` = 4px). Common rhythm:

- Card padding: `p-5` (20px) or `p-6` (24px). Cards with header use `px-5 py-4` for header, `p-5` for body.
- Page padding: `px-6 py-8` mobile, `px-8 lg:px-10` desktop. Set on `.page-inner`.
- Gaps between sections in a page: `space-y-6`.
- Form field gaps: `space-y-4`.
- Inline gaps (icon + label, button group): `gap-2` or `gap-2.5`.
- Max page width: `1500px` (`--max-width-page`). Wider feels indulgent.

### 2.4 Radii

| Token         | Value | Use                                            |
| ------------- | ----- | ---------------------------------------------- |
| `--radius-xs` | 4px   | Small chips, kbd.                              |
| `--radius-sm` | 6px   | (Reserved)                                     |
| `--radius-md` | 8px   | Buttons, inputs, small cards.                  |
| `--radius-lg` | 12px  | Cards, panels, primary containers.             |
| `--radius-xl` | 16px  | Auth form cards, hero containers.              |
| `--radius-2xl`| 20px  | (Reserved, very prominent containers)          |

In Tailwind: `rounded-lg` for buttons/inputs, `rounded-xl` for cards, `rounded-2xl` for hero auth cards, `rounded-full` for badges and avatar circles.

### 2.5 Shadows

Subtle and layered. Never blurry / never heavy.

| Token                  | Value                                                                          | Use                          |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| `--shadow-card`        | `0 1px 2px rgba(15,15,15,.04), 0 1px 1px rgba(15,15,15,.03)`                   | All cards and panels.        |
| `--shadow-card-hover`  | `0 4px 14px rgba(15,15,15,.06), 0 1px 2px rgba(15,15,15,.04)`                  | Card hover/interactive card. |
| `--shadow-pop`         | `0 14px 40px rgba(15,15,15,.10), 0 2px 6px rgba(15,15,15,.05)`                 | Popovers, dropdowns, modals. |
| `--shadow-inset`       | `inset 0 1px 0 rgba(255,255,255,.6)`                                           | Inside inputs (subtle gleam).|

Apply via `shadow-[var(--shadow-card)]` in Tailwind.

### 2.6 Focus rings

Every interactive element gets a brand-tinted ring on `:focus-visible`. Globally:

```css
:where(button, a, input, select, textarea, [role="button"]):focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
  border-radius: 6px;
}
```

Inputs additionally use a 4px ring while focused (in their component class): `focus:ring-4 focus:ring-[color:var(--color-ring)]`. The outline + ring stack is intentional.

### 2.7 Selection

```css
::selection {
  background: var(--color-brand-100);
  color: var(--color-brand-900);
}
```

### 2.8 Scrollbars

Thin scrollbars that appear on hover only:

```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background: transparent;
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
*:hover::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  background-clip: padding-box;
}
```

---

## 3. `globals.css` — drop-in file

This is the entire foundation file. Drop into `src/app/globals.css` of any Next.js + Tailwind v4 app:

```css
@import "tailwindcss";

@theme {
  --color-bg: #fafaf9;
  --color-surface: #ffffff;
  --color-surface-muted: #f7f7f5;
  --color-surface-sunken: #f3f3f1;
  --color-border: #e7e7e3;
  --color-border-strong: #d8d8d2;
  --color-ring: rgba(21, 93, 252, 0.18);

  --color-ink-900: #0a0a0a;
  --color-ink-700: #2a2a28;
  --color-ink-500: #5f5f5a;
  --color-ink-400: #82827b;
  --color-ink-300: #a8a8a1;
  --color-ink-200: #c9c9c2;

  --color-brand-50: #eff4ff;
  --color-brand-100: #d8e4ff;
  --color-brand-200: #b2c8ff;
  --color-brand-300: #82a4ff;
  --color-brand-400: #5180fb;
  --color-brand-500: #155dfc;
  --color-brand-600: #0f4ad6;
  --color-brand-700: #0c3ba8;
  --color-brand-800: #0a2f82;
  --color-brand-900: #07215c;

  --color-success: #10b981;
  --color-success-soft: #ecfdf5;
  --color-warning: #f59e0b;
  --color-warning-soft: #fffbeb;
  --color-danger: #ef4444;
  --color-danger-soft: #fef2f2;

  --shadow-card: 0 1px 2px rgba(15, 15, 15, 0.04), 0 1px 1px rgba(15, 15, 15, 0.03);
  --shadow-card-hover: 0 4px 14px rgba(15, 15, 15, 0.06), 0 1px 2px rgba(15, 15, 15, 0.04);
  --shadow-pop: 0 14px 40px rgba(15, 15, 15, 0.10), 0 2px 6px rgba(15, 15, 15, 0.05);
  --shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.6);

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;

  --max-width-page: 1500px;
}

* { box-sizing: border-box; }
html, body { min-height: 100%; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-ink-900);
  font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-feature-settings: "cv11", "ss01", "ss03";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

button, input, select, textarea { font: inherit; color: inherit; }
input::placeholder, textarea::placeholder { color: var(--color-ink-300); }

:where(button, a, input, select, textarea, [role="button"]):focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
  border-radius: 6px;
}

* { scrollbar-width: thin; scrollbar-color: var(--color-border-strong) transparent; }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background: transparent;
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
*:hover::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  background-clip: padding-box;
}

::selection {
  background: var(--color-brand-100);
  color: var(--color-brand-900);
}

h1, h2, h3, h4 { letter-spacing: -0.02em; }

/* ----- Utilities (Tailwind v4 @utility directive) ----- */

@utility page-shell {
  @apply min-h-screen bg-[color:var(--color-bg)];
}

@utility page-inner {
  @apply mx-auto w-full max-w-[1500px] px-6 py-8 sm:px-8 lg:px-10;
}

@utility card {
  @apply rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)];
}

@utility card-hover {
  @apply transition-shadow hover:shadow-[var(--shadow-card-hover)];
}

@utility surface-muted {
  @apply bg-[color:var(--color-surface-muted)] border border-[color:var(--color-border)] rounded-xl;
}

@utility hairline {
  @apply border border-[color:var(--color-border)];
}

@utility eyebrow {
  @apply text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)];
}

@utility chip {
  @apply inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-ink-700)];
}

@utility chip-brand {
  @apply inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-brand-700)];
}

@utility kbd {
  @apply inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-1.5 text-[10px] font-medium text-[color:var(--color-ink-500)];
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 200ms ease-out both; }
```

---

## 4. Component primitives

Every primitive lives in `src/components/ui/` and is exported from `src/components/ui/index.ts`.

### 4.1 Button

Six variants × three sizes. Loading state spinner is built in. Use `leftIcon` / `rightIcon` for icons.

**Variants**:
- `primary` — dark ink-900 bg, white text. The single most prominent action on a screen. **At most one per visible region.**
- `secondary` — white bg, hairline border. The default button. Use for everything that isn't *the* action.
- `ghost` — no border, no bg. Hover gets a subtle muted bg. Use in toolbars, table rows, dense UIs.
- `outline` — transparent bg with strong border. Rare — use when you need emphasis but not a primary.
- `danger` — red bg, white text. Destructive only. **Always confirm before triggering.**
- `link` — inline link styled, no padding, brand color, hover underline.

**Sizes**:
- `sm` — `h-8`, `text-[13px]`, `px-3`. Tables, toolbars, dense forms.
- `md` (default) — `h-10`, `text-sm`, `px-4`. Default for forms and headers.
- `lg` — `h-11`, `text-[15px]`, `px-5`. Auth forms, primary CTAs in hero sections.

**Full source** (`src/components/ui/button.tsx`):

```tsx
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
  { className = "", variant = "primary", size = "md", leftIcon, rightIcon, loading = false, fullWidth = false, children, disabled, type = "button", ...rest },
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
        <svg aria-hidden className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
          <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </button>
  );
});
```

**Button label rules**:
- Verb-first: "Save changes", not "Changes". "Create funnel", not "New".
- Loading text drops the trailing "s": "Saving" not "Saving…". (The Button doesn't add an ellipsis — the spinner is the affordance.)
- Never use "Submit" or "OK". Always describe the action.

### 4.2 Input, Textarea, Select, Field

All share a single `baseField` class so they look identical. Fields are inputs wrapped in a `<label>` with optional label/hint/error.

**Full source** (`src/components/ui/input.tsx`):

```tsx
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const baseField =
  "block w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors duration-150 focus:border-[color:var(--color-brand-500)] focus:outline-none focus:ring-4 focus:ring-[color:var(--color-ring)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:opacity-70";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return <input ref={ref} className={`${baseField} h-10 px-3.5 text-sm ${className}`} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={`${baseField} resize-y px-3.5 py-2.5 text-sm leading-6 ${className}`} {...rest} />;
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
  label, hint, error, children, required, className = "",
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
```

**Usage**:

```tsx
<Field label="Email" required hint="We'll never share it.">
  <Input name="email" type="email" placeholder="you@company.com" />
</Field>
```

**Input rules**:
- Inputs are always full-width inside their container. Constrain via the parent.
- Placeholder text should be a real example, never repeat the label. "you@company.com" not "Enter email".
- Numeric inputs add `tabular-nums` to the className.
- For an inline action (label + link), pass JSX to `label`:

```tsx
<Field
  label={
    <span className="flex items-center justify-between">
      <span>Password</span>
      <Link href="/reset" className="text-[12px] font-medium text-[color:var(--color-brand-600)] hover:underline">
        Forgot?
      </Link>
    </span>
  }
  required
>
  <Input type="password" />
</Field>
```

### 4.3 Card

A card has three optional parts: `CardHeader` (with eyebrow/title/description/actions), `CardBody`, `CardFooter`. Always use them together — don't reinvent card chrome.

**Full source** (`src/components/ui/card.tsx`):

```tsx
import { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
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
  title, description, eyebrow, actions, className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">{title}</h3>
        ) : null}
        {description ? (
          <p className="mt-1 text-[13px] text-[color:var(--color-ink-500)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-5 py-3 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
}
```

**Card composition pattern**:

```tsx
<Card>
  <CardHeader
    eyebrow="Workspace"
    title="Team members"
    description="Manage who has access."
    actions={<Button size="sm">Invite</Button>}
  />
  <CardBody>
    {/* content */}
  </CardBody>
  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

**Card rules**:
- Never nest cards inside cards. If you need a sub-panel, use `surface-muted` utility (`rounded-xl border bg-surface-muted`).
- Header is for context. Body is for content. Footer is for actions (right-aligned).
- For a card with no header chrome, just use `<Card><CardBody>…</CardBody></Card>` — don't omit `CardBody` since padding lives there.

### 4.4 Badge

Five tones. Always pill-shaped (`rounded-full`). Always small (`text-[11px]`).

**Full source** (`src/components/ui/badge.tsx`):

```tsx
import { HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-700)]",
  brand:   "border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger:  "border-red-200 bg-red-50 text-red-700",
};

export function Badge({
  className = "", tone = "neutral", children, ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
```

**Tone usage**:
- `neutral`: counts, labels, default states ("Draft", "Inactive").
- `brand`: highlighting, "your role", linked entity types.
- `success`: completed states ("Connected", "Active", "Complete").
- `warning`: needs attention but not broken ("Needs secret", "Pending").
- `danger`: errors and destructive states ("Failed", "Revoked").

### 4.5 Component index

```ts
// src/components/ui/index.ts
export { Button } from "./button";
export { Input, Textarea, Select, Field } from "./input";
export { Card, CardHeader, CardBody, CardFooter } from "./card";
export { Badge } from "./badge";
```

Import from a single path everywhere: `import { Button, Card, Field, Input } from "@/components/ui";`

---

## 5. Layout shells

Every page sits inside one of four shells. They handle background, max width, padding, header chrome.

### 5.1 AppShell (authenticated app pages)

Page header with eyebrow + title, optional underlined tab bar, optional right-side actions. Wrap the page's main content.

```tsx
type ShellTab = { href: string; label: string };

export function AppShell({
  active, title, subtitle, tabs = [], actions, children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  tabs?: ShellTab[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-400)]">
                {subtitle || "Workspace"}
              </div>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-[color:var(--color-ink-900)]">
                {title}
              </h1>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>

          {tabs.length ? (
            <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-[color:var(--color-border)]">
              {tabs.map((tab) => {
                const isActive = active === tab.href || active === tab.label;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative inline-flex h-9 items-center whitespace-nowrap px-3.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "text-[color:var(--color-ink-900)]"
                        : "text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
                    }`}
                  >
                    {tab.label}
                    {isActive ? (
                      <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[color:var(--color-ink-900)]" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </header>

        <div className="animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
```

**Page header anatomy**:
1. Eyebrow (subtitle) — small uppercase, section name ("Workspace", "Billing", "Settings · Team").
2. H1 — what this page is ("Notes", "Funnels").
3. Right-side actions — secondary buttons that apply to the whole page.
4. Tabs — sibling pages, underline indicator.

The body is wrapped in `.animate-fade-in` for a 200ms entry animation on route change.

### 5.2 AppSidebar (left nav for authenticated app)

Light off-white sidebar, 244px wide, collapsible to 48px. Workspace identity at top, drag-orderable nav, sign out at bottom. Active item gets a 2px brand accent bar on the left and a white "lifted" surface.

Key structural rules:
- `sticky top-0 h-screen w-[244px]` on the `<aside>`.
- Background: `bg-[color:var(--color-surface-muted)]` (lighter than page bg — counterintuitive but anchors the eye).
- Each nav item is a `<Link>` rendered with icon (h-5 w-5 box, h-4 w-4 icon stroke) + label. Active gets `bg-surface ring-1 ring-border shadow-[0_1px_2px_rgba(0,0,0,0.04)]`.
- Workspace identity: 28px ink-900 rounded-lg square with white "H" + product name + tagline below.
- Section labels above nav groups use `text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400`.

```tsx
<aside className="sticky top-0 flex h-screen w-[244px] shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]">
  {/* Brand */}
  <div className="px-3.5 pt-4 pb-3">
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--color-ink-900)]">
        <span className="text-[13px] font-bold text-white">H</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          ProductName
        </div>
        <div className="truncate text-[11px] text-[color:var(--color-ink-400)]">
          Tagline
        </div>
      </div>
    </div>
  </div>

  {/* Section label */}
  <div className="px-3.5 pb-2">
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-400)]">
      Workspace
    </div>
  </div>

  {/* Nav items */}
  <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
    <div className="flex flex-col gap-0.5">
      {/* Each item: */}
      <Link
        href="/notes"
        className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 bg-[color:var(--color-surface)] text-[color:var(--color-ink-900)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[color:var(--color-border)]"
      >
        {/* Active accent bar */}
        <span className="absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[color:var(--color-brand-500)]" />
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[color:var(--color-brand-600)]">
          {/* icon */}
        </span>
        <span className="min-w-0 truncate">Notes</span>
      </Link>
    </div>
  </nav>
</aside>
```

### 5.3 AuthPageShell (login, signup, reset, update password)

Full-bleed off-white background with a soft radial gradient and faint dot/grid pattern (masked to fade out at edges). Two-column layout on desktop: hero copy on left, form card on right. Header has brand + privacy/terms links. Footer is centered copyright.

Key elements:
- Background: `var(--color-bg)` plus a `radial-gradient(60% 50% at 8% 0%, rgba(21,93,252,0.07), transparent 60%)` and a grid pattern masked with `radial-gradient(70% 60% at 50% 30%, black, transparent 80%)`.
- Form card: `rounded-2xl border bg-surface p-6 shadow-card sm:p-8`.
- Hero side has: pill eyebrow chip, 44px headline, description, feature checklist with brand-tinted check icons.

```tsx
export function AuthPageShell({
  eyebrow = "Product",
  headline = "Built for high-leverage teams.",
  description = "Operate from a single workspace.",
  children,
}: { eyebrow?: string; headline?: string; description?: string; children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--color-bg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 8% 0%, rgba(21,93,252,0.07), transparent 60%), radial-gradient(50% 40% at 100% 100%, rgba(21,93,252,0.05), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,15,15,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,15,15,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent 80%)",
        }}
      />
      {/* …header, hero + form, footer */}
    </main>
  );
}
```

### 5.4 LegalPageShell (privacy, terms)

Single column, `max-w-3xl`, generous prose. Back link to home. Eyebrow says "Legal". H1 at 40px. Body uses tailwind arbitrary selectors for `h2` (20px, mt-10), `h3` (16px, mt-6), `a` (brand-600, hover underline), `strong` (ink-900).

```tsx
<article className="prose prose-neutral mt-8 max-w-none space-y-6 text-[15px] leading-[1.75] text-[color:var(--color-ink-700)] [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[color:var(--color-ink-900)] [&_h3]:mt-6 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-[color:var(--color-ink-900)] [&_a]:font-medium [&_a]:text-[color:var(--color-brand-600)] [&_a:hover]:underline [&_strong]:text-[color:var(--color-ink-900)] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
  {children}
</article>
```

---

## 6. Page composition patterns

These are the building blocks every page uses. Copy them — don't reinvent.

### 6.1 Section header inside a card

For sections inside long forms. The brand accent bar visually anchors the section.

```tsx
<div className="mb-5 flex items-center gap-3">
  <span className="h-6 w-1 rounded-full bg-[color:var(--color-brand-500)]" />
  <h2 className="text-[18px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
    Section title
  </h2>
</div>
```

### 6.2 Stat card (numeric display)

For dashboards. Big number, small label, small icon in a muted square.

```tsx
<div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
  <div className="flex items-center justify-between">
    <p className="text-[12px] font-medium text-[color:var(--color-ink-400)]">Leads</p>
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-500)]">
      {/* h-4 w-4 icon */}
    </div>
  </div>
  <p className="mt-3 text-[32px] font-semibold tabular-nums tracking-tight text-[color:var(--color-ink-900)]">
    {value.toLocaleString()}
  </p>
</div>
```

Grid: `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`.

### 6.3 Progress bar

1.5px tall, muted background, brand fill. Tabular numerals on the percentage.

```tsx
<div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]">
  <div
    className="h-full rounded-full bg-[color:var(--color-brand-500)] transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

### 6.4 Data table

Bordered, no zebra striping. Header row uses muted bg with eyebrow-style column labels.

```tsx
<section className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
  <div className="border-b border-[color:var(--color-border)] px-6 py-4">
    <h2 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">Title</h2>
    <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">Subtitle.</p>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-ink-500)]">
          <th className="px-4 py-3 font-semibold">Col</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-[color:var(--color-border)] transition-colors last:border-b-0 hover:bg-[color:var(--color-surface-muted)]/40">
          <td className="px-4 py-3 align-top">value</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

**Row hover**: `hover:bg-[color:var(--color-surface-muted)]/40` (the `/40` is a 40% opacity modifier — subtle).
**Inputs inside rows**: use the same h-9 + rounded-lg + hairline pattern as form inputs. Inline editing should look native.

### 6.5 Banner / inline alert

Use for status messages — never `<alert>` modals. Always pair with a small icon.

```tsx
{/* Success */}
<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
  Saved successfully.
</div>

{/* Error */}
<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700" role="status">
  Something went wrong.
</div>

{/* Warning */}
<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
  Heads up.
</div>

{/* Info / brand */}
<div className="rounded-xl border border-[color:var(--color-brand-100)] bg-[color:var(--color-brand-50)] px-4 py-3 text-[13px] text-[color:var(--color-brand-700)]">
  Tip.
</div>
```

For inline form feedback (below a submit button), use the smaller `rounded-lg px-3.5 py-2.5` variant.

### 6.6 Empty state

For empty lists. Small icon in a muted circle, title, supporting line, primary CTA.

```tsx
<div className="flex flex-col items-center justify-center px-6 py-12 text-center">
  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-400)]">
    {/* h-6 w-6 icon */}
  </div>
  <h3 className="text-[15px] font-semibold text-[color:var(--color-ink-900)]">No items yet</h3>
  <p className="mt-1 max-w-sm text-[13px] text-[color:var(--color-ink-500)]">
    Supporting copy that explains what they'll see here.
  </p>
  <Button className="mt-5">Create one</Button>
</div>
```

### 6.7 List item (member row, schedule row, etc.)

A bordered, muted-bg row inside a card body. Avatar/icon left, content middle, actions right.

```tsx
<div className="flex items-center justify-between rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3">
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[11px] font-semibold text-[color:var(--color-brand-700)]">
      AB
    </div>
    <div>
      <p className="text-[13px] font-semibold text-[color:var(--color-ink-900)]">Title</p>
      <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-500)]">Subtitle</p>
    </div>
  </div>
  <Badge tone="success">Active</Badge>
</div>
```

### 6.8 Avatar / initials circle

Always a circle. Brand-tinted bg for primary identity, neutral muted for secondary.

```tsx
<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[11px] font-semibold text-[color:var(--color-brand-700)]">
  {initials}
</div>
```

Initials helper:
```ts
function initials(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
```

### 6.9 Connection / integration card

Header row with icon square + label + status badge, body description, footer "Configure →" link.

```tsx
<Link href="/settings/slack" className="group block rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all hover:border-[color:var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)]">
  <div className="flex items-start justify-between gap-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--color-surface-muted)] text-[color:var(--color-ink-700)]">
      {/* h-5 w-5 brand icon */}
    </div>
    <Badge tone="success">Connected</Badge>
  </div>
  <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
    Slack
  </h3>
  <p className="mt-1 text-[13px] leading-6 text-[color:var(--color-ink-500)]">
    Description.
  </p>
  <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-brand-600)]">
    Configure
    <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5">…</svg>
  </div>
</Link>
```

### 6.10 Numbered step / onboarding row

Used on get-started flows. Each step is a card; the number lives in a colored circle that changes by state.

```tsx
<li className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
  <div className="flex items-start gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-[14px] font-semibold">
      {/* checkmark icon when done, number otherwise */}
    </div>
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-[14px] leading-6 text-[color:var(--color-ink-500)]">{body}</p>
    </div>
  </div>
</li>
```

State colors:
- **Complete**: `bg-emerald-50 text-emerald-700 ring-emerald-200`.
- **Required**: `bg-brand-50 text-brand-700 ring-brand-100`.
- **Optional**: `bg-surface-muted text-ink-500 ring-border`.

### 6.11 Definition list (dl)

For displaying account / config info.

```tsx
<dl className="grid gap-4 text-[14px]">
  <div className="grid gap-1">
    <dt className="text-[12px] font-medium text-[color:var(--color-ink-400)]">Label</dt>
    <dd className="text-[color:var(--color-ink-900)]">Value</dd>
  </div>
</dl>
```

For IDs / hashes / slugs, use `font-mono text-[12px]` on the `<dd>`.

---

## 7. Iconography

- **Source**: inline SVG, hand-rolled. No icon library (avoid bundle weight, full control).
- **Style**: line icons, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`.
- **Stroke widths**:
  - `1.5` — very thin, only in large hero illustrations.
  - `1.75` — default for sidebar nav, integration cards, decorative.
  - `2` — emphasis (success checks, button icons, table actions).
  - `2.5` — extreme emphasis (chevrons in CTAs).
- **Sizes**:
  - `h-3 w-3` — inline with `text-[11px]` labels.
  - `h-3.5 w-3.5` — small button icons.
  - `h-4 w-4` — default button icons, badge icons, alert icons.
  - `h-5 w-5` — sidebar nav, card header icons.
  - `h-6 w-6` — empty state icons, integration cards.
- **Color**: always `currentColor` — color the parent text.
- **Line caps/joins**: always `strokeLinecap="round" strokeLinejoin="round"`.

Reference: pull from Feather / Lucide for the shapes. Don't import the package — just paste the path data inline.

---

## 8. Motion

Restrained. Three patterns:

1. **Fade-in page bodies** — `animate-fade-in` utility (200ms ease-out, 2px slide-up).
2. **Hover transitions** — `transition-colors duration-150` on text/bg color changes, `transition-all duration-150` on buttons (also captures shadow/transform).
3. **Active press** — `active:scale-[0.99]` on primary/secondary/ghost/outline buttons. Subtle, NOT a bounce.

That's it. No drawer slides, no parallax, no scroll-driven animations. If you find yourself reaching for Framer Motion, you're probably over-designing.

---

## 9. Accessibility

- Every interactive element has `focus-visible` ring (handled by global rule).
- Form fields use `<label>` with the input nested inside (the `Field` primitive does this).
- Icons inside buttons either have `aria-hidden` or the button itself has visible text. Never icon-only buttons without `aria-label`.
- Status messages use `role="status"` for screen readers.
- Color contrast: ink-900 on bg passes AAA. Ink-500 on surface-muted is the minimum for body text — meets AA. Don't use ink-400 on white for anything important.
- Links inside paragraphs use `text-brand-600` with `hover:underline` so color isn't the only affordance.
- Disabled buttons get `opacity-50` and `cursor-not-allowed` — and disable the click via the `disabled` prop, not pointer-events.

---

## 10. Loading & async UX

- Buttons that trigger async work use `loading` prop. The button disables itself and swaps icon → spinner. Don't add "..." to the label; the spinner is the affordance.
- For longer waits (>2s), the button label changes from imperative to gerund: "Save" → "Saving" (no ellipsis).
- Pages don't have global spinners. Use skeleton states or the fade-in on body content.
- Save status feedback: a small banner (success or error) appears at the top of the affected section. It is NOT a toast — toasts disappear and are easy to miss.

---

## 11. File / folder structure

```
src/
├── app/
│   ├── globals.css         ← all tokens + base styles
│   ├── layout.tsx          ← Inter font loaded here
│   └── [route]/page.tsx
└── components/
    ├── ui/                 ← primitives only
    │   ├── button.tsx
    │   ├── input.tsx       ← Input, Textarea, Select, Field
    │   ├── card.tsx        ← Card, CardHeader, CardBody, CardFooter
    │   ├── badge.tsx
    │   └── index.ts
    ├── app-shell.tsx       ← page header + tabs wrapper
    ├── app-sidebar.tsx     ← left nav
    ├── app-chrome.tsx      ← combines sidebar + main on auth routes
    ├── auth-page-shell.tsx ← login/signup/reset shell
    └── legal-page-shell.tsx← privacy/terms shell
```

Rule: nothing in `components/ui/` may import from outside `components/ui/`. Primitives are leaf nodes.

---

## 12. Anti-patterns

These will look wrong. Do not do them.

| Anti-pattern                                          | Do instead                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Hardcoded hex in components: `bg-[#f8fafc]`           | Use a token: `bg-[color:var(--color-surface-muted)]`             |
| `text-gray-500`                                       | `text-[color:var(--color-ink-500)]`                              |
| `border-2`, `border-4`                                | Always hairline (1px) — emphasis via color, not weight.          |
| `shadow-lg`, `shadow-2xl`                             | `shadow-[var(--shadow-card)]` — never use Tailwind defaults.     |
| `bg-blue-500` for a CTA                               | `bg-[color:var(--color-ink-900)]` — CTAs are ink, not brand.     |
| Two primary buttons on one screen                     | One primary; the other becomes `variant="secondary"`.            |
| Rounded-md mixed with rounded-lg in one layout        | Pick one radius per role and stick to it.                        |
| Toasts for save feedback                              | Inline banner above the section.                                 |
| Modal-everything                                      | Inline edit, side panel, or new route. Modals are rare.          |
| `font-bold` on body text                              | `font-semibold` (600) is the heaviest weight in the system.      |
| Multi-color buttons in one row                        | Hierarchy = one primary (ink), rest secondary/ghost.             |
| Different border colors per section                   | Always `--color-border`. Differentiation via spacing & label.    |
| `text-3xl font-bold` for section titles               | Use `text-[18px] font-semibold tracking-tight`.                  |
| Tabs as pill-buttons                                  | Tabs are underlined (no chrome) — see AppShell.                  |
| Sticky-positioning a non-sticky-feeling element       | Sticky is for sidebars and save bars only. Headers stay put.     |
| Heavy gradients                                       | Gradients only in auth hero — subtle radial, brand at <10% opacity.|
| Icons without `currentColor`                          | Always `stroke="currentColor"` so parent text color flows.       |
| Random hover states (color shifts, shadow changes)    | Hover = bg shifts to next-step surface, period.                  |

---

## 13. Migration checklist (applying to a new app)

When you take this system to another codebase:

1. **Install Inter via `next/font/google`**, set `variable: "--font-inter"`, apply to `<html>` and `<body>` in the root layout.
2. **Replace `src/app/globals.css`** with the file in section 3.
3. **Create `src/components/ui/`** with the four primitive files (button, input, card, badge) and `index.ts`.
4. **Build the four shells** (`AppShell`, `AppSidebar`, `AuthPageShell`, `LegalPageShell`) — copy the structure from section 5.
5. **Audit existing pages** route-by-route. For each page:
   - Replace its outer wrapper with the appropriate shell.
   - Replace bespoke buttons with `<Button>`. One primary per screen.
   - Replace bespoke inputs with `<Field>` + `<Input>` / `<Textarea>` / `<Select>`.
   - Replace bespoke cards with `<Card>` + `<CardHeader>` + `<CardBody>`.
   - Replace status pills / role labels with `<Badge>`.
   - Remove any `border-2`, hex colors, and Tailwind default shadows.
6. **Run lint + build** after each page. Tailwind v4 will fail loudly on missing tokens.
7. **Final pass**: open every page in the browser, eyeball it for the three rules (quiet by default, one scale, composition). Anything that draws the eye unintentionally is a bug.

---

## 14. Naming conventions

- **Token names**: `--color-{role}-{step}` (e.g., `--color-ink-700`). Roles: `bg`, `surface`, `surface-muted`, `surface-sunken`, `border`, `border-strong`, `ring`, `ink`, `brand`, `success`, `warning`, `danger`.
- **Component files**: kebab-case (`app-shell.tsx`).
- **Component exports**: PascalCase (`AppShell`).
- **Utility classes**: kebab-case after `@utility` (e.g., `card-hover`, `page-inner`).
- **Props**: camelCase, no Hungarian notation. Booleans positive-true: `loading`, `disabled`, `fullWidth` (not `isLoading`).

---

## 15. Versioning this document

When the system evolves, do not silently change tokens. Either:
- **Patch** — add new tokens / utilities. Existing code unaffected.
- **Minor** — non-breaking refactor (e.g., split a primitive into two). Update this doc.
- **Major** — token rename or removal. Update all apps in lockstep, bump a `DESIGN_SYSTEM_VERSION` constant somewhere, and write a migration note.

Right now this doc tracks **v1.0** — the version shipped in HyperOptimal Funnel.

---

## 16. Quick reference cheat sheet

Pin this above your monitor.

```
BACKGROUND       bg-[color:var(--color-bg)]              #fafaf9
SURFACE          bg-[color:var(--color-surface)]         #ffffff
MUTED            bg-[color:var(--color-surface-muted)]   #f7f7f5
BORDER           border-[color:var(--color-border)]      #e7e7e3

INK PRIMARY      text-[color:var(--color-ink-900)]       #0a0a0a
INK MUTED        text-[color:var(--color-ink-500)]       #5f5f5a
INK SUBTLE       text-[color:var(--color-ink-400)]       #82827b

BRAND ACCENT     bg-[color:var(--color-brand-500)]       #155dfc
BRAND TEXT       text-[color:var(--color-brand-600)]     #0f4ad6
BRAND SOFT       bg-[color:var(--color-brand-50)]        #eff4ff

RADIUS BUTTON    rounded-lg                              12px? No — 8px
RADIUS CARD      rounded-xl                              12px
RADIUS HERO      rounded-2xl                             16px

CARD SHADOW      shadow-[var(--shadow-card)]
CARD HOVER       shadow-[var(--shadow-card-hover)]

H1               text-[28px] font-semibold leading-tight tracking-tight
H2               text-[18px] font-semibold tracking-tight
CARD TITLE       text-[15px] font-semibold tracking-tight
BODY             text-[14px] / text-sm
SMALL            text-[13px]
META             text-[12px]
EYEBROW          text-[11px] font-semibold uppercase tracking-[0.14em]

BUTTON SIZES     sm: h-8 px-3 text-[13px]
                 md: h-10 px-4 text-sm
                 lg: h-11 px-5 text-[15px]

FOCUS RING       focus:ring-4 focus:ring-[color:var(--color-ring)]
FADE IN          animate-fade-in (200ms)
ACTIVE PRESS     active:scale-[0.99]
```

That's the whole system. Anything you can't find here probably doesn't belong.
