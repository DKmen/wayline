---
name: wayline-testing
description: >
  Vitest + Playwright conventions for Wayline — test placement, coverage
  thresholds, the positive/negative testing discipline, and the no-typed-
  value-capture test requirement. Use whenever writing or reviewing tests
  anywhere in the repo.
when_to_use: >
  Writing a new test; deciding Vitest vs Playwright; reviewing test coverage
  or completeness on a PR.
paths:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/*.spec.ts'
  - 'e2e/**'
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(pnpm *)
---

# Wayline testing conventions

## Tool selection

**Vitest** for unit + component tests: dashboard components via React Testing Library, API handler logic with a mocked/test DB, extension `lib/*` pure logic against a fixture DOM.

**Playwright** for anything needing a real browser/extension context: extension e2e (`chromium.launchPersistentContext` + the built extension against `apps/fixture` — docs/06 §8), dashboard integration/user-flow tests, anything jsdom/happy-dom can't faithfully emulate (shadow-DOM piercing, real `chrome.*` APIs, actual tab-screenshot capture, cross-tab/service-worker behavior).

## File naming & location

Co-locate unit tests as `Module.test.ts(x)` next to source — no parallel `__tests__` tree. Playwright specs as `*.spec.ts` under `e2e/` (or a per-app `tests/e2e/`). This keeps Turbo's test-filter globs simple and lets `*.test.*` vs `*.spec.*` cleanly separate "coverage-gated" from "not."

## Coverage

v8 provider, 95% thresholds (lines/branches/functions/statements). **CI is the authoritative full-repo gate**; `pre-push` (Lefthook) re-runs the same full-repo suite locally as a fast backstop — not authoritative, don't mistake it for CI. (`vitest.config.ts` is a single shared root config, not per-package, so there's no "affected packages only" to filter to — every invocation runs the whole suite regardless.) Playwright is excluded from the coverage percentage entirely — CI pass/fail only, it has no real coverage concept to gate on.

## Positive + negative discipline — honestly scoped

Required practice: every exported function/handler/component with conditional logic gets ≥1 test proving intended behavior and ≥1 proving correct handling of bad input, unauthorized access, or an edge case.

**Explicit caveat — state this plainly, don't oversell**: no tool verifies this mechanically. 95% branch coverage + `eslint-plugin-jest`'s `expect-expect` rule only nudge toward it (branches get hit, every test asserts _something_) — neither proves the negative case is meaningful, or that intent was tested rather than just a code path. This lives in code review / the PR checklist, not CI.

Concrete negative-test anchor list (docs/09 §5) so "negative test" isn't left abstract: non-member 403s on flow metadata **and** assets, 4th-flow publish rejection at the free-tier entitlement boundary, expired signed-URL rejection.

## No-typed-value-capture tests (docs/06 §3, docs/09 §1)

The one case where a test **and** a lint rule both exist for the same guarantee — call this out as the exception to "process not tooling":

- Required suite in `apps/extension/lib/capture/`: serialize every step shape produced by capture code against a fixture set of DOM inputs (text/password/select/textarea) and assert the literal typed/selected value never appears anywhere in the output.
- Paired with — not replaced by — the ESLint rule banning `.value`/`textContent` reads in `lib/capture/`. The lint rule catches the code pattern; the test catches the behavior. Keep both.

## Backend test conventions

Handler tests mock Drizzle/db for pure logic. **Workspace-scoping guarantees specifically need an integration test against real Postgres** (docker-compose) — a dedicated cross-workspace negative-test suite asserting workspace A can never read/write workspace B's rows, since the lint rule is only a static approximation of this guarantee.

## Frontend test conventions

React Testing Library, query by role/label (don't conflate the product's `target_descriptor.testId` concept with test-authoring `data-testid` queries), `QueryClientProvider` test wrapper for TanStack Query.

## Playwright/fixture conventions

`apps/fixture` is the canonical target site for capture/walkthrough tests (shadow DOM/iframe/nav cases built in — docs/08 §2) — extend it rather than spinning up ad hoc HTML per spec. Tag a smoke subset for the CI-required `e2e-smoke` check vs. a fuller pre-release run (docs/08 §6).
