# Wayline — Agent Instructions

Private-by-default browser workflow capture. TypeScript monorepo: `apps/extension` (WXT/MV3), `apps/dashboard` (Vite+React), `apps/landing` (Astro), `apps/api` (Hono+Drizzle+Better Auth), `apps/render-worker` (Lambda ffmpeg/sharp), `apps/fixture` (test-only). Packages: `shared-types`, `ui`, `config`. Solo/part-time dev, 12×2-week sprints. Full pitch and doc map: `docs/00-product-brief.md`. Stack detail: `docs/03-architecture.md`.

This file is deliberately self-contained (not a pointer to a separate skill file) — nested `AGENTS.md` files under `apps/dashboard`, `apps/landing`, and `apps/api` add domain-specific detail on top of this root file; they're read _together_ with this one when you're working in those directories, not instead of it.

## Ground rules — comment policy

This project overrides the general default of writing no comments:

- Every exported function/component gets a **one-line doc-comment** stating purpose.
- Inline comments only for non-obvious **why** (workaround, business rule, security/perf tradeoff) — never restate what the code does.
- Test: if deleting the comment would make a reader misunderstand _intent_, keep it; if it just narrates the next line, delete it.

## One-thing-per-file

One component/function per file is a stated rule. Mechanically enforced only for React (`react/no-multi-comp` in the dashboard/landing ESLint config) and classes generically (`max-classes-per-file`). Everywhere else — API handlers, extension modules, plain utilities — it's convention + code review, not a lint gate. Be honest about this distinction; don't claim tooling coverage that doesn't exist.

## Testing discipline

- Vitest + v8 coverage provider, **95% thresholds** (lines/branches/functions/statements). CI is the authoritative gate; `pre-push` (Lefthook) re-runs it on affected packages only as a fast local backstop, never a substitute for CI.
- Playwright e2e/integration tests are **not** coverage-gated — CI pass/fail only.
- **Positive + negative test discipline**: every exported function/handler/component with branching logic needs at least one test proving intended behavior and at least one proving correct handling of bad input, unauthorized access, or an edge case.
- **Be honest about this**: no tool mechanically verifies "every function has both a positive and a negative test." Coverage thresholds and `expect-expect`-style lint rules only _nudge_ toward it — they prove code executed and something was asserted, not that the negative case was meaningful. This is a code-review/PR-checklist responsibility.
- Concrete negative-test list to anchor against (see `docs/09-security-privacy.md §5`): non-member 403s on flow metadata and assets, 4th-flow publish rejection at the free-tier entitlement boundary, expired signed-URL rejection.
- The one place a test _and_ a lint rule both exist for the same guarantee: no-typed-value-capture in `apps/extension/lib/capture/`. The ESLint ban on `.value`/`textContent` reads pairs with a serialization test asserting no captured value ever appears in a step — keep both, they catch different failure modes (the lint rule catches the code pattern, the test catches the behavior).

## Workspace scoping (critical, full pattern lives in `apps/api/AGENTS.md`)

Every query against a tenant-owned table **must** go through the shared workspace-scope helper — never call `db.select()/.update()/.delete()` directly against a tenant table. `(user, workspace, role)` is resolved once in middleware and read from request context, never re-derived per handler. See `apps/api/AGENTS.md` for the full pattern with an example.

## Git / ticket workflow

1. Look up the ticket in Plane; confirm it's startable; read its description/acceptance criteria.
2. Move the ticket to "In Progress" in Plane.
3. Branch off latest `main`: `<type>/WAYLI-123-short-slug`, where `<type>` reuses the same enum as the commit-message type (`feat`, `fix`, `refactor`, `perf`, `chore`, ...).
4. Implement with a test-first discipline (write a failing test, make it pass, refactor) — brainstorm/plan first if the ticket is ambiguous rather than guessing at scope.
5. Before opening a PR: run lint, typecheck, full test suite with coverage, and self-review the diff.
6. Open the PR with the ticket ID in the title; fill out every field in `.github/PULL_REQUEST_TEMPLATE.md`; request review.
7. After merge: move the Plane ticket to Done, attach proof (coverage summary tail, a Playwright HTML report link for UI-affecting changes, the CI run URL, and a one-line human-readable summary of what changed and why), and link the merged PR.

Commit messages are Conventional Commits; `feat`/`fix`/`refactor`/`perf` commits require a `WAYLI-123`-shaped scope (enforced by commitlint) — `chore`/`docs`/`test`/`ci`/`build` commits don't need a ticket.

## Banned patterns

- No `.value`/`textContent` reads on form controls in `apps/extension/lib/capture/`.
- No Drizzle query against a tenant table that bypasses the workspace-scope helper.
- No hardcoded entitlement limits inline — read from the versioned constant in `packages/shared-types`.
- No `<all_urls>` / broad host permission requested at extension install.
- No hand-duplicated wire types — import from `packages/shared-types`.
- No comments that restate code.

## Directory map

- `apps/dashboard/AGENTS.md` — full React/TanStack Query&Router/shadcn/design-token conventions.
- `apps/landing/AGENTS.md` — deliberately **thinner**: design tokens + accessibility + content conventions only (Astro has no TanStack Query/Router surface — don't "fix" this file into a duplicate of the dashboard one).
- `apps/api/AGENTS.md` — full backend conventions, including the complete workspace-scoping pattern with example.
