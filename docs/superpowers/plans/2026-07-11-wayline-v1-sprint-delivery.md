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

- [ ] Create Plane parent and child tickets for shared contracts, local stack, CI, UI tokens, fixture, and project-management skills.
- [ ] Define Step, TargetDescriptor, event, role, and entitlement schemas in `packages/shared-types`.
- [ ] Establish Docker parity services, environment validation, repository quality gates, and fixture coverage.
- [ ] Create the dashboard scaffold and `packages/ui` token/Storybook baseline.
- [ ] Acceptance: `pnpm dev`, lint, typecheck, tests, and build run locally and in CI.

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

## Sprint Closeout

- [ ] Confirm committed tickets are Done or explicitly rescheduled with reason and dependency impact.
- [ ] Demonstrate the sprint acceptance gate.
- [ ] Attach CI, coverage, Playwright, and required privacy/security evidence to Plane.
- [ ] Record new risks, decisions, scope changes, and next-sprint blockers.
