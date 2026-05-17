# HyperOptimal Management Design Context

## Design Register

Product UI. Design serves speed, trust, and clarity.

## Visual System

- Font: Montserrat everywhere, using the shared Next.js font variable.
- Canvas: light cool gray page background with white panels.
- Navigation: Scaling Metrics-style slate gradient sidebar, compact parent labels, compact child rows, visible active state, subtle drag affordance.
- Density: desktop-first and compact, with clear grouping rather than oversized cards.
- Radius: small radii, generally 4px to 10px.
- Elevation: subtle shadows only when separating panels from the page canvas.
- Accent: restrained blue for primary action, focus, and active state.

## Page Shell

- Use the shared app shell on authenticated product pages.
- Page title and member-since kicker should sit consistently at the top of each page.
- Tabs should sit directly under or near the page header, use the shared compact tab styling, and wrap safely on smaller screens.
- Main content should be constrained enough to read on wide displays while still supporting full-width operational tables when needed.
- Avoid nested cards. Use section spacing, dividers, and table rows for hierarchy.

## Shared Sidebar Design Standard

This standard applies across HyperOptimal SaaS apps. The sidebar should feel like a compact professional SaaS navigation system: calm, dense, readable, and consistent across apps. HyperOptimal Management should match the Scaling Metrics sidebar implementation in size, spacing, type, accordion behavior, and interaction details.

### 1. Structure

- Fixed left sidebar on desktop.
- Collapsible drawer or hidden menu on mobile.
- Recommended desktop width: `220px`.
- Full viewport height.
- Main content starts immediately to the right.
- Sidebar scrolls independently if navigation exceeds viewport height.

### 2. Visual Style

- Use a dark slate vertical gradient: `#1e293b` to `#1e293b` to `#0f172a`.
- Use muted text for inactive items.
- Use brighter text for active and hover items.
- Use one clear active state with background plus border or left rail.
- Use subtle dividers between navigation groups.
- Use small badges for counts only when useful.
- Do not use decorative blobs, oversized icons, or marketing styling.

### 3. Navigation

- Group related links into sections.
- Use short labels.
- Keep row height compact.
- Active page must be obvious.
- Collapsed groups should use chevrons.
- Nested items should be indented consistently.
- Avoid more than two nav nesting levels.

### 4. Recommended Tokens

```css
:root {
  --sidebar-width: 220px;
  --sidebar-bg: #1e293b;
  --sidebar-bg-hover: #374151;
  --sidebar-bg-active: rgba(37, 99, 235, 0.2);
  --sidebar-border: rgba(51, 65, 85, 0.7);
  --sidebar-text: #9ca3af;
  --sidebar-text-muted: #64748b;
  --sidebar-text-active: #dbeafe;
  --sidebar-primary: rgba(96, 165, 250, 0.6);
  --sidebar-badge-bg: rgba(51, 65, 85, 0.7);
  --sidebar-badge-text: #f1f5f9;
  --sidebar-padding-x: 8px;
  --sidebar-section-gap: 4px;
  --sidebar-item-height: 26px;
  --sidebar-item-radius: 4px;
  --sidebar-item-padding-x: 8px;
  --sidebar-font-size: 12px;
  --sidebar-section-font-size: 9.7px;
  --sidebar-badge-font-size: 8px;
}
```

### 5. Item Style

- Font size: `12px`.
- Height: `24px` to `26px`.
- Radius: `4px`.
- Padding: `4px 8px`.
- Display should support optional icon or chevron, label, and optional badge.
- Hover should use a slightly lighter background.
- Active should use blue-tinted background, active text, and optional left rail or border.

### 6. Section Labels

- Uppercase.
- Small: `9.7px`.
- Muted.
- Letter spacing: `0.0575em`.
- Used sparingly to separate groups.

### 7. Badges

- Small rounded pills.
- Minimum width: `24px`.
- Height: `16px`.
- Font size: `10px`.
- Use only for counts, statuses, or alerts.

### 8. Accessibility

- Every nav item should be a real link or button.
- Active item should use `aria-current="page"` when applicable.
- Collapsible groups should expose expanded or collapsed state.
- Keyboard focus must be visible.
- Contrast must be readable against the dark background.

### 9. Mobile

- Sidebar should not squeeze the app content.
- Use a drawer, slide-over, or collapsible menu.
- Keep touch targets at least `40px` on mobile.

## Components

- Buttons: shared primary, dark, and secondary utilities.
- Inputs: shared field and textarea utilities with visible focus states.
- Labels: short, uppercase operational labels for dense forms.
- Tables: sticky mental model, clear headers, compact rows, graceful horizontal overflow on small screens.
- Empty states: explain what is missing and the next useful action, without implementation notes.
- Errors: visible, concise, and recoverable.
- Loading states: preserve layout and indicate progress without page jumps.

## Responsive Behavior

- Desktop is the primary layout.
- At tablet and mobile widths, panels stack, tabs wrap, tables can scroll horizontally, and touch targets must remain usable.
- Text must not overflow controls or overlap neighboring content.
- Sidebar may collapse, but navigation must remain reachable.

## Accessibility

- Interactive elements need visible focus states.
- Form controls need labels.
- Color cannot be the only state indicator.
- Touch targets should be at least 44px on narrow screens where practical.
- Long names, emails, and record titles must truncate or wrap intentionally.

## Copy Rules

- Keep UI copy concise and user-facing.
- Do not mention internal setup, migrations, RLS, Supabase, service-role keys, or provider diagnostics in normal app screens.
- No em dashes.
