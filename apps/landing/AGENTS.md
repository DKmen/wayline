# apps/landing — Agent Instructions

Astro static marketing site. Read alongside the root `AGENTS.md` — this file only adds what's specific to a static, content-first site. **Deliberately thin**: no TanStack Query/Router content here, unlike `apps/dashboard/AGENTS.md` — Astro has no client-side data-fetching or routing surface of that kind.

## Design tokens (see `docs/05-design-system.md`)

Same Wayline brand tokens as the dashboard — Way Blue `#2A6FDB`, Ink `#17222F`, Mist `#F6F7F9`, Amber `#B9750B`, Instrument Sans. Consume via the shared Tailwind v4 `@theme` tokens in `packages/ui`; never hardcode hex values in a page/component file.

## Accessibility

- Semantic HTML first (Astro components render to plain HTML — lean into `<nav>`, `<main>`, `<section>`, headings in order).
- Every interactive element (nav, CTA buttons, pricing toggle if any) keyboard-operable and legible at 200% zoom.
- Images need real `alt` text describing content/purpose, not filenames.

## Content conventions

- Copy lives close to the page that renders it (co-located content, not a separate CMS layer, for v1).
- Landing pages are public and unauthenticated — never reference internal-only concepts (workspace IDs, entitlement internals) in visible copy.
- Privacy/security messaging is a product differentiator here (see `docs/00-product-brief.md` positioning) — don't bury it; it's meant to appear earlier on the page than this category's convention.
