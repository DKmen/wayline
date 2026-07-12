# Wayline v1 Delivery Design

## Goal

Deliver the private-by-default workflow-capture product through thirteen two-week vertical slices, with the dashboard developed alongside its API and extension dependencies.

## Delivery model

- The repository plan is the technical source of truth; Plane is the daily execution board.
- Each sprint has one parent ticket and independently testable child tickets. Tickets record scope, dependencies, acceptance criteria, affected surfaces, positive/negative tests, and closeout evidence.
- Sequencing is local-first: S0–S9 build and prove the entire product against the local docker-compose stack, with zero AWS account, DNS, or credential in existence. S10 is the single dedicated cloud-provisioning gate; only S11–S13 (landing, billing, launch) touch production DNS/traffic.
- `wayline-project-management` manages portfolio-level planning; `wayline-workflow` governs picked-up ticket delivery.
- Shared Zod schemas in `packages/shared-types` are the only wire contracts. Server-side workspace scoping, entitlement enforcement, redaction validation, and asset authorization remain authoritative.

## Dashboard strategy

- Establish the Vite/React application, shared tokens, and authenticated shell before feature screens.
- Add dashboard surfaces in the same vertical slice as the capability they expose: local-draft library and editor, publish/player, follow-live entry, analytics, administration/onboarding, then billing.
- Build Wayline custom components in `packages/ui` Storybook before composing screens, and screenshot-review against the canonical PDF.

## Quality model

- Each sprint requires lint, strict typecheck, 95% coverage-gated unit tests, focused Playwright proof, and visual review where UI changes.
- Typed values never enter captured data; unresolved redactions block publish; unauthorized metadata/assets return 403; the fourth free-tier publish fails server-side; expired signed URLs fail.

## Boundaries

No public sharing, browser automation, voiceover, raw recording, mobile, SSO, or non-Chrome support enters v1 without a new approved plan.
