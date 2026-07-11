# 11 · Roadmap & Sprint Plan

**Cadence**: solo, part-time → 2-week sprints sized at ~25–30 focused hours each. 12 sprints ≈ 6 months to production launch. Each sprint ends with a demoable increment and its acceptance checks green.

**Milestones**

- **M1 — Walking skeleton** (end S2): auth + workspace + deployed hello-world of every surface.
- **M2 — Capture loop** (end S5): record → edit → publish → video, single user.
- **M3 — Guidance loop** (end S7): live walkthrough with safe failure — the differentiator works.
- **M4 — Team product** (end S9): invites, roles, analytics, onboarding.
- **M5 — Production launch** (end S12): landing, billing, CWS listing, hardening.

Dependency spine: S0 → S1 → S2(capture) → S3(editor) → S4(publish) → S5(video) → S6–7(walkthrough) → S8(analytics) → S9(team/onboarding) → S10(landing/gating) → S11(billing/hardening) → S12(launch). Slack is built in: any sprint may spill one week without moving M5 past month 7.

---

### Sprint 0 — Foundations

Monorepo (pnpm+Turborepo, layout per [08](./08-local-dev.md)); `packages/shared-types` with Step/TargetDescriptor Zod schemas; `packages/config` (strict TS, lint rules incl. capture value-ban + workspace-scope rule); docker-compose stack; CI (lint/typecheck/test/build); AWS org + dev/prod accounts, OIDC provider, OpenTofu state backend; SES domain verification + **production-access request submitted** (long lead time); Route 53 + ACM.
**Accept**: `pnpm dev` boots everything locally; CI green on a PR; `tofu apply` stands up the empty dev VPC.

### Sprint 1 — Auth & workspaces (API + dashboard shell)

Better Auth (magic link via Mailpit locally/SES in dev, Google OAuth); users/workspaces/members/invitations schema + migrations; dashboard shell (sign-in, workspace create, empty library) with Wayline tokens in `packages/ui`; API on ECS dev via CI (migration-gate pattern from day one).
**Accept**: sign up via magic link locally and on dev URL; workspace created; role guards unit-tested.

### Sprint 2 — Extension skeleton + auth bridge _(M1)_

WXT scaffold (popup, SW, content script, side panel); cookie-session auth bridge + `externally_connectable` install/session pings; per-site optional-permission flow with disclosure card; fixture app (`apps/fixture`).
**Accept**: extension shows signed-in identity from the web session; sign-out flips it live; permission card works on fixture.

### Sprint 3 — Capture engine

Capture listeners + noise filters; step assembly in SW (settle heuristic, SPA nav via webNavigation + Navigation API); screenshot queue (≤2/s coalescing); descriptor builder; IndexedDB draft store; recording pill UI (start/pause/undo/finish/discard).
**Accept**: 10-step fixture flow recorded with correct steps/screenshots/descriptors; typed-value absence tests pass; SW-kill mid-recording recovers.

### Sprint 4 — Editor + redaction

Editor screens per PDF 2b (filmstrip DnD, canvas, inspector) reading local drafts via extension bridge; caption editing, reorder/merge/delete/manual step; **undo/redo**; redaction rects (destructive blur on export) + heuristic warnings; publish blocked while warnings unresolved.
**Accept**: full edit of a recorded draft; blur is irreversible in output; publish button reflects warning count.

### Sprint 5 — Publish + video render _(M2)_

Publish pipeline (intent → presigned PUTs → commit → immutable version, entitlement check in tx); flows/versions/steps/assets schema; SQS + render worker (sharp composition + ffmpeg encode, Lambda container + local poll mode); render callback + status; flow page with player, chapters, text-guide sidebar; CloudFront signed-URL delivery.
**Accept**: publish from editor → MP4 plays in dashboard with correct spotlight geometry across two viewport sizes; non-member gets 403 on metadata and assets; failed render → DLQ + status + retry.

### Sprint 6 — Walkthrough engine

Descriptor resolver + scoring + thresholds; walkthrough state machine in SW; spotlight overlay + bottom bar; side panel steps/progress; advance detection (click/input/navigate); step-URL navigation.
**Accept**: 10-step fixture walkthrough completes hands-off-the-wheel (viewer acts, Wayline only observes); ambiguous fixture case refuses to highlight.

### Sprint 7 — Safe failure + reports _(M3)_

Pause cards (target-missing w/ reference screenshot, unsupported page, permission); retry/skip/report; broken_step_reports API + creator email; resume-after-tab-close; walkthrough completion screen + mark-as-done.
**Accept**: every row of the failure table in [06 §6](./06-extension-spec.md) demonstrated on fixture; report reaches creator email locally.

### Sprint 8 — Analytics

Event batching from player + walkthrough; `/v1/events` ingest; view_sessions/view_events partitions; nightly rollup task; flow analytics tab (tiles, step funnel, viewers table, reports list).
**Accept**: completion visible in dashboard ≤60s after walkthrough ends; funnel matches a scripted session exactly.

### Sprint 9 — Team & onboarding _(M4)_

Invites (email + accept flow), members page, role changes; workspace settings + audit log writes; onboarding checklist with live extension-install detection; empty states + first-run tours; personal settings/sessions.
**Accept**: new-user journey (invite → sign-in → watch → follow live) e2e-tested; checklist completes itself as steps happen.

### Sprint 10 — Landing + freemium gating

Astro landing (home, pricing, security, legal, waitlist) → S3/CloudFront; freemium enforcement end-to-end (3-flow limit server-side, upgrade modal, usage meters); analytics plan-gating; prod environment stood up via OpenTofu; runbooks drafted.
**Accept**: landing live on prod domain; 4th-flow publish rejected via API even with a forged client; Lighthouse ≥90 on landing.

### Sprint 11 — Billing + hardening

Stripe (Pro/Team checkout, portal, webhooks → subscriptions/plan sync, downgrade behavior); rate limiting pass; WAF rate rule; full `/security-review` checklist; load sanity (k6 on publish + events); DR drill (PITR restore); Sentry release health wired.
**Accept**: upgrade/downgrade round-trip in Stripe test mode updates entitlements live; security checklist zero criticals; restore drill documented.

### Sprint 12 — Launch _(M5)_

CWS listing (privacy policy, disclosures, screenshots, unminified-friendly build) + submission buffer for review; pilot workspace onboarding (2–3 real teams); alarm tuning from real traffic; bug bar triage; public waitlist → invite wave.
**Accept**: extension live on CWS; pilot team completes [00 §6 success criteria](./00-product-brief.md) including first-flow-under-15-minutes; all alarms quiet for 72h under pilot load.

---

## Cross-sprint workstreams

- **Testing**: unit + the sprint's e2e scenario every sprint; failure tests accumulate into the CI suite (never a "testing sprint").
- **Design**: build `packages/ui` components against PDF references in the sprint that first needs them; screenshot-review before feature merge.
- **Docs**: runbooks and this doc set updated in the sprint that changes them; ADRs for any deviation from [03-architecture.md](./03-architecture.md).

## Top risks & mitigations

| Risk                                         | Mitigation                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| CWS review delays at launch                  | Submit a minimal listed beta by S9; minimal permissions; unobfuscated build; server kill-switches for skew |
| Descriptor resolution accuracy on real sites | Start real-site test matrix in S6, not S12; pause-card UX means failures are safe, not embarrassing        |
| SES production access / deliverability       | Request in S0; DKIM + bounce alarms; magic-link fallback = Google OAuth                                    |
| Solo part-time burnout / stall               | Milestone gates are demoable; any sprint can ship half-scope as long as its acceptance subset stays green  |
| Scope creep (AI features, more browsers)     | Non-goals list in [00](./00-product-brief.md) is the contract; new ideas → post-v1 backlog doc             |
