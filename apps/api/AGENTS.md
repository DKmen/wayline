# apps/api — Agent Instructions

Hono + Zod + Drizzle + Better Auth. Read alongside the root `AGENTS.md` — this file adds the backend-specific detail, including the full workspace-scoping pattern only summarized at root.

## Handler conventions

- One route handler per file (e.g. `routes/flows/publish-intent.ts`); router index files only wire/register routes, no logic. This is convention + code review, not lint-enforced — no general "one function per file" ESLint rule exists; be honest about that when reviewing.
- Every request body/query/params parsed via a Zod schema imported from `packages/shared-types` (single source of truth — never hand-duplicate a wire type). Parse-don't-validate: after `schema.parse()`, use the typed result; never re-touch the raw `req` object downstream.

## Workspace scoping — the load-bearing rule

Every query against a tenant-owned table goes through one shared Drizzle helper (e.g. `withWorkspaceScope(db, workspaceId)` or a `scopedDb(ctx)` factory attached to request context) — **never** call `db.select()/.update()/.delete()` directly against a tenant table.

```ts
// BAD — bypasses tenant isolation entirely
const flow = await db.select().from(flows).where(eq(flows.id, flowId));

// GOOD — every read/write is scoped to the caller's workspace
const flow = await scopedDb(ctx).select().from(flows).where(eq(flows.id, flowId));
```

`(user, workspace, role)` is resolved **once**, in auth middleware, and attached to request context — handlers read it from context, never re-derive it. A workspace-scoping cross-workspace negative test (workspace A can never read/write workspace B's rows) belongs in the integration suite against a real Postgres instance, since a lint rule is only a static approximation of this guarantee.

## Error handling

Hono error middleware maps typed errors (`NotFoundError`, `ForbiddenError`, `EntitlementExceededError`, `ValidationError`) to one consistent JSON error shape + status code; Zod validation failures are auto-formatted through the same path. Never leak stack traces in production responses. Structured logs use an explicit field allow-list — no request bodies, no screenshots, no email contents (see `docs/09-security-privacy.md §2`).

## Entitlement checks

`assertEntitlement(workspaceId, key)` helper; keys always come from the versioned constant in `packages/shared-types` — never hardcode a limit inline. Count-style checks (e.g. the free-tier published-flow limit) run **inside the same transaction** as the state change (`SELECT ... FOR UPDATE`) to prevent a race-through right at the limit.

## Versioning & migrations

REST + Zod-validated JSON, OpenAPI generated from routes, `/v1` prefix, additive-only changes within a major (the Chrome extension can lag days behind due to store review times — never change an existing response shape in a breaking way without a version bump). Migrations are Drizzle SQL, expand/contract only, generated via `pnpm db:generate`, run as a one-off ECS task before deploy — never hand-edit a migration once it's merged to `main`.

## Idempotency

Any handler touching `render_jobs` or render callbacks (SQS-triggered paths) must tolerate redelivery — key on `flow_version_id`/`render_job_id`, not on "this only runs once" assumptions.
