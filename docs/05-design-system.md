# 05 · Wayline Design System & Screen Inventory

Source of truth for visual direction: `App workflow and design specification.pdf` (this folder) — the approved hi-fi mockups. This doc translates it into buildable tokens and enumerates every screen.

## 1. Brand

| Token        | Value                                              | Use                                                         |
| ------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| `--ink`      | `#17222F`                                          | Primary text, dark surfaces                                 |
| `--way-blue` | `#2A6FDB`                                          | Primary actions, links, spotlight outline, recording accent |
| `--mist`     | `#F6F7F9`                                          | App background, cards                                       |
| `--amber`    | `#B9750B`                                          | Warnings (redaction, blocked publish)                       |
| Success      | `#1E7F4F` _(derived — verify against PDF renders)_ | Published, completed                                        |
| Danger       | `#C2402A` _(derived)_                              | Destructive, render failure                                 |

- **Type**: Instrument Sans (Google Fonts) — headings 600, body 400/500; mono (JetBrains Mono) for URLs/selectors in the editor inspector.
- **Voice**: calm, plain, privacy-forward. Every privacy-relevant surface states the guarantee in-line ("Typed values are never captured · everything stays on this device until you publish" — verbatim from PDF 2c).
- **Tagline**: _Every workflow, one line to follow._
- Implementation: Tailwind v4 `@theme` OKLCH tokens in `packages/ui`, consumed by dashboard, extension (side panel/popup/overlay via shadow root), and landing. Light theme first; dark theme is a token swap later.

## 2. Component inventory (shadcn/ui base + custom)

**shadcn primitives**: Button, Input, Dialog, DropdownMenu, Tooltip, Tabs, Badge, Table, Toast, Avatar, Skeleton, Command (search).

**Custom (the product's identity — build carefully):**

| Component             | Where                     | Notes from PDF                                                                                                                    |
| --------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `FlowCard`            | Library                   | Title, status chip (Published vN / Draft · local / ⚠ warnings), step count · duration, updated-at                                 |
| `Filmstrip`           | Editor + player           | Numbered thumbnails, drag-reorder (editor), warning badge, active state                                                           |
| `StepCanvas`          | Editor                    | Screenshot, target outline, redaction rects (▨ with ✕ remove)                                                                     |
| `RedactionPanel`      | Editor                    | Amber warning cards: finding, Redact it / View / Keep as-is                                                                       |
| `RecordingPill`       | Content script overlay    | Floating: ● Recording, Step n · time, last-step toast ("Step 4 captured — Click 'Export CSV'" + Undo + ▨ Redact), Finish & review |
| `SpotlightOverlay`    | Content script            | Full-page dim (ink @ ~55%), rounded cutout on target, way-blue 2px outline + pulse, instruction tooltip with arrow                |
| `WalkthroughBar`      | Content script bottom bar | Step x/N, instruction, "Waiting for your click — Wayline never acts for you", ↻ Retry / Skip / ⚑ Report / Exit                    |
| `PauseCard`           | Content script            | Three variants per PDF 2f: target-missing (reference screenshot), unsupported-page, permission                                    |
| `VideoPlayer`         | Dashboard                 | `<video>` + caption band + chapter filmstrip, "Click a step to seek"                                                              |
| `OnboardingChecklist` | Dashboard home            | 5 items, live extension-install detection                                                                                         |
| `PlanUsageMeter`      | Publish modal, settings   | "2 of 3 free flows used"                                                                                                          |

## 3. Screen inventory

### Landing (Astro) — `wayline.app`

1. Home (hero split-screen video/walkthrough, how-it-works, privacy block **third**, pillars, use cases, pricing teaser)
2. Pricing (transparent 3-tier table)
3. Security & privacy page
4. Waitlist / changelog (pre-launch)
5. Legal: privacy policy, terms (CWS requires a hosted privacy policy)

### Dashboard (React SPA) — `app.wayline.app`

| Screen                                    | PDF ref | Notes                                                                                                                                 |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in / magic-link sent / invite accept | —       | logo + one input; no passwords                                                                                                        |
| Workspace create (first-run)              | —       | name + slug                                                                                                                           |
| Flow library                              | **2a**  | Tabs: All / Drafts · on this device / Published; search; New recording CTA ("Opens the Wayline extension"); onboarding checklist card |
| Step editor                               | **2b**  | Filmstrip · canvas · inspector; redaction queue; blocked-publish state ("⚠ 2 warnings to resolve")                                    |
| Flow page + video player                  | **2e**  | Player, chapters, text-guide sidebar, **Follow live in Chrome**, version switcher (Pro)                                               |
| Flow analytics                            | —       | Funnel per step, viewers table, broken-step reports ([10-analytics-spec.md](./10-analytics-spec.md))                                  |
| Members & invites                         | —       | Table + role menus + invite modal                                                                                                     |
| Workspace settings / plan & billing       | —       | Usage meters, upgrade modal, danger zone                                                                                              |
| Personal settings                         | —       | Name, avatar, sessions                                                                                                                |

### Extension (WXT)

| Surface                     | PDF ref  | Notes                                                                             |
| --------------------------- | -------- | --------------------------------------------------------------------------------- |
| Popup (signed out)          | —        | "Sign in on wayline.app"                                                          |
| Popup (idle)                | —        | One primary **Start capture** + current-site permission state + link to dashboard |
| Disclosure/permission card  | **2f-3** | Per-site allow, "minimum Chrome permissions" line                                 |
| Recording pill + step toast | **2c**   | On-page, draggable                                                                |
| Side panel — walkthrough    | **2d**   | Step list, progress, controls mirroring bottom bar                                |
| Pause cards                 | **2f**   | 3 variants                                                                        |
| Walkthrough complete        | —        | ✅ + mark-as-done                                                                 |

## 4. Interaction rules (product-defining)

1. **The spotlight never lies**: highlight only above confidence threshold; otherwise pause card. No guessed highlights, ever.
2. **Undo everywhere in the editor**: every destructive edit (delete/merge/reorder/redact) is undoable until publish.
3. **Privacy copy is a UI element**: capture, publish, and permission surfaces each carry their one-line guarantee.
4. **One primary action per surface** (Guidde/Tango pattern): popup → Start capture; editor → Publish (or its blocked state); flow page → Follow live.
5. Keyboard: editor (⌘Z/⇧⌘Z, arrows between steps, del), player (space, ←/→ step seek).
6. Accessibility: side panel and overlays are ARIA-labelled; overlay tooltip readable at 200% zoom; spotlight has a non-color signifier (outline + tooltip arrow); all flows completable keyboard-only in the dashboard.

## 5. Mockup workflow going forward

- The PDF stays the canonical reference for the seven screens it covers (2a–2g). New screens (analytics, members, settings, landing) get designed in code with the tokens above — build the `packages/ui` Storybook first, compose screens from it, and screenshot-review against the PDF's density/spacing before feature work uses them.
- Favicon/extension icon: the PDF's mark (2g) — export 16/32/48/128px.
