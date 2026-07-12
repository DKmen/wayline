# Wayline v1 Sprint Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `wayline-project-management` to maintain sprint control and `wayline-workflow` for any individual Plane ticket.

**Goal:** Ship Wayline v1 through twelve independently demonstrable, dependency-ordered sprints.

**Architecture:** Deliver vertical slices across extension, API, dashboard, rendering, and infrastructure. The dashboard never substitutes client state for server-side authorization, workspace scope, entitlement, or privacy enforcement.

**Tech Stack:** TypeScript, pnpm/Turborepo, Vite/React/TanStack/shadcn, WXT/MV3, Hono/Zod/Drizzle, PostgreSQL, S3/SQS, Lambda ffmpeg/sharp, Playwright, Vitest.

## Global Constraints

- Use `packages/shared-types` for every shared wire schema; never duplicate a type by hand.
- Workspace-owned API access always uses the shared workspace-scope helper.
- No captured form value may be read, serialized, uploaded, logged, or rendered.
- Use versioned entitlement constants; server transactions enforce plan limits.
- Every exported function/component gets a one-line doc-comment and branching behavior gets meaningful positive and negative tests.
- CI requires lint, typecheck, unit coverage at 95%, build, and e2e smoke checks.

## Sprint Checklist

### S0 — Foundations

- [x] Create Plane parent and child tickets for shared contracts, local stack, CI, UI tokens, fixture, and project-management skills.
- [x] Define Step, TargetDescriptor, event, role, and entitlement schemas in `packages/shared-types`.
- [x] Establish Docker parity services, environment validation, repository quality gates, and fixture coverage.
- [x] Create the `packages/ui` token/Storybook baseline. (The dashboard app scaffold itself is S1 scope — `WAYLI-29` — not S0; this bullet originally conflated the two, corrected during the WAYLI-26 reconciliation pass.)
- [ ] Provision the AWS organization/accounts, GitHub OIDC provider, OpenTofu state backend, Route 53/ACM, SES verification/production-access request, and empty dev VPC (`WAYLI-83`).
- [ ] Acceptance: `pnpm dev`, lint, typecheck, tests, and build run locally and in CI; `tofu apply` stands up the empty dev VPC.

### S1 — Auth and Workspaces

- [ ] Create identity/tenancy API tickets: Better Auth, workspace/member/invitation schema, middleware context, role guards.
- [ ] Create dashboard tickets: sign-in, workspace creation, authenticated shell, empty library.
- [ ] Acceptance: a user signs in and creates a workspace; role-guard and cross-workspace negative tests pass.

### S2 — Extension Session Bridge

- [ ] Create WXT shell, cookie session bridge, install/session detection, and optional-host-permission tickets.
- [ ] Create dashboard onboarding/install-status ticket.
- [ ] Acceptance: extension sign-in/out follows the dashboard session and fixture permissions work.

### S3 — Capture and Local Drafts

- [ ] Create capture, step assembly, screenshot queue, descriptor, IndexedDB, and recording-pill tickets.
- [ ] Create library/extension-bridge handoff ticket for local drafts.
- [ ] Acceptance: a fixture 10-step capture survives service-worker recovery and contains no typed values.

### S4 — Editor and Redaction

- [ ] Create editor filmstrip, canvas, inspector, caption, and history tickets.
- [ ] Create redaction-heuristic, resolution, destructive-export, and publish-blocker tickets.
- [ ] Acceptance: a creator completes a full draft edit; unresolved warnings block publish and output redaction is irreversible.

### S5 — Publish and Video

- [ ] Create flow/version/asset persistence, publish intent/commit, scoped uploads, entitlement transaction, and render-job tickets.
- [ ] Create worker composition/callback and signed-delivery tickets.
- [ ] Create dashboard publish, render-state, player, chapter-filmstrip, and text-guide tickets.
- [ ] Acceptance: published video geometry is correct at two viewport sizes; non-members receive 403 for metadata and assets.

### S6 — Live Walkthrough

- [ ] Create resolver/scoring, state-machine, spotlight, side-panel, progress, and expected-action tickets.
- [ ] Create dashboard follow-live entry/interstitial ticket.
- [ ] Acceptance: a viewer completes a fixture flow while Wayline only observes actions; ambiguous targets are never highlighted.

### S7 — Safe Failure and Reports

- [ ] Create target-missing, unsupported-page, permission, retry/skip/report, resume, and completion tickets.
- [ ] Create broken-step report API/email and dashboard feedback-to-editor tickets.
- [ ] Acceptance: every documented failure mode pauses safely and report delivery is verified.

### S8 — Analytics

- [ ] Create event batch/ingest, session storage, rollup, and retention tickets.
- [ ] Create dashboard flow analytics, funnel, viewer table, and report-list tickets.
- [ ] Acceptance: a walkthrough completion appears within 60 seconds and a scripted funnel matches exactly.

### S9 — Team and Onboarding

- [ ] Create invite, acceptance, role-change, removal, audit-log, workspace-settings, and personal-session tickets.
- [ ] Create dashboard members, settings, and event-driven onboarding tickets.
- [ ] Acceptance: invite-to-watch-to-follow-live passes end-to-end and checklist progress is observed rather than manually asserted.

### S10 — Landing and Freemium

- [ ] Create landing, legal, waitlist, entitlement UI, usage meter, upgrade modal, and analytics-gating tickets.
- [ ] Acceptance: the landing is deployed and a fourth free-tier publication fails through both UI and direct API request.

### S11 — Billing and Hardening

- [ ] Create Stripe checkout, portal, webhook, plan-sync, downgrade, rate-limit, WAF, Sentry, load, and restore-drill tickets.
- [ ] Acceptance: Stripe test-mode plan changes update entitlements and the security/restore gates pass.

### S12 — Pilot and Launch

- [ ] Create Chrome Web Store, pilot onboarding, alarm tuning, release readiness, and waitlist rollout tickets.
- [ ] Acceptance: pilot teams meet the v1 product criteria and alarms remain quiet for 72 hours.

## Decisions & Risk Log

Material scope/product/security/privacy decisions, by sprint. Appended at closeout per the Sprint Closeout gate below — not edited retroactively.

### S0

- **Repo visibility**: `DKmen/wayline` switched private → public (`WAYLI-22`). GitHub branch-protection Rulesets require GitHub Pro for private repos on a free account; going public was the user's explicit choice over a process-only gate, made after a full git-history secret scan confirmed the repo was clean.
- **Danger token contrast**: shadcn's default destructive/danger red failed WCAG AA against Wayline's theme once the real-browser Storybook a11y tier could actually check it (`WAYLI-24`). Darkened using real sRGB→OKLab→OKLCH conversion + WCAG contrast math rather than accepting the library default.
- **Fixture architecture** (`WAYLI-25`): vanilla TS + Vite, no framework — keeps DOM mutations for the target-change case deterministic (no virtual-DOM reconciliation). Same-origin iframe only; cross-origin deferred to S2 alongside the extension (needs the extension to verify against). Playwright harness is package-scoped (`apps/fixture` owns its own config), not shared at root, anticipating S2's `chromium.launchPersistentContext`-based extension suite needing a fundamentally different launch mechanism.
- **Scope correction**: this delivery plan's S0 checklist had conflated the dashboard app scaffold with the `packages/ui` token/Storybook baseline. The live Plane backlog (`docs/plane/wayline-v1-backlog.md`) and the S0/S1 epics never actually included a dashboard scaffold under S0 — that's `WAYLI-29` (S1). No scope was dropped; the checklist wording was just imprecise and is now corrected.
- **AWS-foundation backlog correction**: the roadmap requires AWS accounts, OIDC, remote OpenTofu state, Route 53/ACM, SES setup, and an applied empty dev VPC in S0, but the original Plane import had no child ticket for that work and the repository contains no OpenTofu configuration. `WAYLI-83` now carries the missing scope. S0 remains open until that ticket and the sprint acceptance gate are proven; no completed local-foundation work was reclassified.
- **Agent workflow parity**: Claude already had the ticket-to-Plane adapter in `.claude/skills/wayline-workflow`; Codex only had the portfolio-level `wayline-project-management` skill while referring to the missing adapter. Added a Codex-compatible `skills/wayline-workflow` counterpart with the same pickup, review, QA, merge, evidence, and closeout seams. Each runtime keeps native frontmatter while sharing the same project rules.

## Sprint Closeout

- [ ] Confirm committed tickets are Done or explicitly rescheduled with reason and dependency impact.
- [ ] Demonstrate the sprint acceptance gate.
- [ ] Attach CI, coverage, Playwright, and required privacy/security evidence to Plane.
- [ ] Record new risks, decisions, scope changes, and next-sprint blockers.
