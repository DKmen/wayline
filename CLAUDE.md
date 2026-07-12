# Wayline

Private-by-default browser workflow capture — TypeScript monorepo, solo/part-time dev, 12×2-week sprints. Full doc map and pitch: [docs/00-product-brief.md](./docs/00-product-brief.md). Stack summary: [docs/03-architecture.md §1](./docs/03-architecture.md). This file is the _entry point_; it points at docs/skills rather than forking their content — edit the source, not the pointer.

Apps: `extension` (WXT/MV3), `dashboard` (Vite+React), `landing` (Astro), `api` (Hono+Drizzle), `render-worker` (Lambda ffmpeg/sharp), `fixture` (test-only target site). Packages: `shared-types`, `ui`, `config`.

## Coding principles

Readability and maintainability first. Prefer explicit over clever. Self-explanatory names over comments explaining names.

**This project explicitly overrides the default "no comments" behavior:**

- Every **exported** function/component/hook gets a **one-line doc-comment** directly above it stating _purpose_ — why it exists, not a param-by-param wall.
- Inline comments are for **non-obvious "why" only**: a workaround, a business-rule justification, a perf/security tradeoff, a reference to the doc that mandates the behavior. Never comment what the code already says.
- Calibration: if you deleted the comment, would a competent reader misunderstand _intent_ (not just mechanism)? If yes, keep it. If it just narrates the next line, delete it.

```ts
// BAD — restates code
// increment retries by 1
retries += 1;

// GOOD — explains non-obvious why
// SQS may redeliver; cap at 3 so a poison message can't loop the worker forever
if (retries < 3) retries += 1;
```

## One-thing-per-file

One component/function per file is a _stated rule_ here, not aspirational. It's mechanically enforced only where a lint rule actually exists — `react/no-multi-comp` (dashboard/landing) and core `max-classes-per-file`. Everywhere else (API handlers, extension lib modules, plain utilities) it's convention + code review, not tooling — say this honestly when reviewing, don't imply ESLint covers it repo-wide. A tightly-coupled sub-component grouping needs a one-line comment justifying it plus reviewer sign-off.

## Testing discipline

- Vitest + v8 provider, **95% thresholds** (lines/branches/functions/statements). CI is authoritative; `pre-push` (Lefthook) re-runs the same full-repo suite locally as a fast backstop — not a substitute for CI. (`vitest.config.ts` is a single shared root config, not per-package, so there's no meaningful "affected packages only" to filter to.)
- Playwright e2e/integration is **not** coverage-gated — CI pass/fail only (Playwright has no real coverage concept to gate on).
- **Positive + negative test requirement — stated as discipline, not tooling**: every exported function/handler/component with branching logic needs ≥1 test proving intended behavior and ≥1 proving correct rejection/handling of bad input, unauthorized access, or an edge case.
- **Honesty clause**: no tool mechanically verifies "every function has both a positive and a negative test." 95% branch coverage + `eslint-plugin-jest`'s `expect-expect` only nudge toward it (branches get exercised, every test asserts _something_) — neither proves the negative case is meaningful. This is a code-review / PR-checklist responsibility, full stop.
- Full detail: `.claude/skills/wayline-testing/SKILL.md`.

## Git / ticket workflow

Branch-per-ticket, PR references the ticket ID, Plane status updated at pickup and at merge. Full mechanics live in `.claude/skills/wayline-workflow/SKILL.md` — this section only states that the policy exists, so it isn't duplicated in two places that can drift.

PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires: ticket link, summary, test-plan checklist (unit added / positive+negative present / coverage maintained / e2e updated if relevant / screenshots for UI changes), and a security-review flag for auth/upload/signing PRs (trigger `/security-review` for those).

## Skills map

| Skill                                                                | Scope                                                    | Triggers on                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `wayline-frontend`                                                   | `apps/dashboard/**`, `apps/landing/**`, `packages/ui/**` | React components, routes, styling, a11y                                 |
| `wayline-backend`                                                    | `apps/api/**`, `packages/shared-types/**`                | Hono routes, Drizzle queries, Zod schemas, entitlements                 |
| `wayline-testing`                                                    | `**/*.test.*`, `**/*.spec.*`, `e2e/**`                   | Writing/reviewing any test                                              |
| `wayline-workflow`                                                   | repo-wide                                                | Picking up a ticket, opening/finishing a PR                             |
| Superpowers `test-driven-development`                                | repo-wide                                                | Implementing new logic                                                  |
| Superpowers `writing-plans` / `brainstorming`                        | repo-wide                                                | Non-trivial feature start                                               |
| Superpowers `using-git-worktrees` / `finishing-a-development-branch` | repo-wide                                                | Branch lifecycle (invoked _through_ `wayline-workflow`, not standalone) |
| Superpowers `requesting-code-review` / `receiving-code-review`       | repo-wide                                                | PR review step                                                          |
| Superpowers `systematic-debugging`                                   | repo-wide                                                | Bug investigation                                                       |
| Superpowers `verification-before-completion`                         | repo-wide                                                | Before declaring any task done                                          |

Superpowers is installed as **skills available on demand, not force-enforced** — there is no always-on session-start hook pushing mandatory skill invocation in this repo. Invoke these skills deliberately when they fit.

## Monorepo cheatsheet

`pnpm dev`, `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm --filter <app> dev`. Full command table: [docs/08-local-dev.md §5](./docs/08-local-dev.md).

## Non-goals / banned patterns

- No `.value`/`textContent` reads on form controls in `apps/extension/lib/capture/` — privacy-critical, see [docs/09-security-privacy.md §2](./docs/09-security-privacy.md).
- No Drizzle query against a tenant table that bypasses the workspace-scope helper — see [docs/03-architecture.md §3.3](./docs/03-architecture.md).
- No hardcoded entitlement limits inline — always read from the versioned constant in `packages/shared-types`.
- No `<all_urls>` / broad host permission requested at extension install.
- No hand-duplicated wire types — always import from `packages/shared-types`.
- No comments that restate code.
