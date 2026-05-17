# HyperOptimal Management Product Context

## Register

Product.

## Product

HyperOptimal Management is a desktop-first SaaS workspace for running the management side of a HyperOptimal business. It brings employees, job descriptions, hiring, training, meetings, learning, calendars, Zoom, billing, team access, Slack, Telegram, email, SMS, and AI-assisted operations into one tenant-scoped application.

## Users

- Owners and operators who need a clear view of management work.
- Managers who review team performance, meetings, training, hiring, and recurring operating workflows.
- Team members who need direct, reliable access to their assigned work and settings.

## Core Jobs

- Review team and employee workflows without losing context.
- Add, edit, and track management records that persist to Supabase.
- Run meetings and training with structured notes and action items.
- Manage team members, invitations, billing, calendars, Zoom, Slack, and Telegram from Settings.
- Keep AI outputs grounded in the AI Context Document and Learnings.

## Product Principles

- Database-first: user and business data must persist to Supabase before it is treated as saved.
- Tenant-safe: authenticated users, organization membership, RLS, and server-side authorization are required for real work.
- Client-facing: no internal notes, implementation status, provider setup language, or architecture jargon in normal product UI.
- Quiet and efficient: this is an operational tool, not a marketing surface.
- Desktop-first: dense, scannable, predictable layouts are preferred, with mobile fallbacks that remain usable.
- Familiar controls: use standard tabs, tables, forms, buttons, empty states, and settings panels.

## Tone

Clear, concise, action-oriented. Labels should use user-facing nouns and verbs. Avoid engineering language such as RLS, tenant-scoped, Supabase, migration, server-side, provider setup, and diagnostics outside admin-only surfaces.

## Anti-References

- Decorative dashboards with oversized cards and fake metrics.
- One-off button styles and inconsistent form controls.
- Internal implementation notes in the product.
- Local-only saves or optimistic success that can lose user data.
- Sidebar or page-shell drift between pages.
