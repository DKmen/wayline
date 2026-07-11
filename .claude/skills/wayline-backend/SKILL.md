---
name: wayline-backend
description: >
  Wayline API conventions — Hono routes, Zod validation at every boundary,
  Drizzle workspace-scoped queries, entitlement checks, error handling. Use
  when creating/editing API routes, DB queries/migrations, or shared wire
  types.
when_to_use: >
  Adding/editing a Hono handler; writing a Drizzle query; adding a Zod schema;
  touching entitlement/auth logic; writing a migration.
paths:
  - apps/api/**
  - packages/shared-types/**
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(pnpm *)
---

# Wayline backend conventions

## One-handler-per-file

Each route handler lives in its own file (e.g. `routes/flows/publish-intent.ts`); router index files only wire/register, no logic. This is convention + code review, not lint-enforced — no general "one function per file" ESLint rule exists anywhere (checked); be honest about this when reviewing, same as the frontend's per-file convention.

## Zod at every boundary

Request body/query/params parsed via schemas imported from `packages/shared-types` (single source of truth — never hand-duplicate a wire type). Parse-don't-validate: after `schema.parse()`, use the typed result; never re-touch the raw `req` object downstream.

## Workspace scoping — the load-bearing rule (docs/03 §3.3, docs/04 header, docs/09 AuthN/AuthZ)

Every query against a tenant-owned table goes through one shared Drizzle helper — never call `db.select()/.update()/.delete()` directly against a tenant table.

```ts
// BAD — bypasses tenant isolation entirely
const flow = await db.select().from(flows).where(eq(flows.id, flowId));

// GOOD — every read/write scoped to the caller's workspace
const flow = await scopedDb(ctx).select().from(flows).where(eq(flows.id, flowId));
```

`(user, workspace, role)` is resolved **once**, in middleware, and attached to request context — handlers read it from context, never re-derive it. A workspace-scoping cross-workspace negative test (workspace A can never read/write workspace B's rows) belongs in the integration suite against real Postgres — a lint rule is only a static approximation of this guarantee, and both matter (see `wayline-testing`).

## Error handling

Hono error middleware maps typed errors (`NotFoundError`, `ForbiddenError`, `EntitlementExceededError`, `ValidationError`) to one consistent JSON error shape + status code; Zod validation failures auto-formatted through the same path. Never leak stack traces in prod responses. Structured logs use an explicit field allow-list — no request bodies, no screenshots, no email contents (docs/09 §2).

## Entitlement-check pattern (docs/04 §5)

`assertEntitlement(workspaceId, key)` helper, keys from the versioned constant in `packages/shared-types` — never hardcode a limit inline. Count-style checks (e.g. the free-tier published-flow limit) run **inside the same transaction** as the state change (`SELECT ... FOR UPDATE`) to prevent a race-through right at the limit.

## Route/versioning conventions

REST + Zod-validated JSON, OpenAPI generated from routes, `/v1` prefix, additive-only changes within a major (extension version skew — docs/03 §7) — never change an existing response shape in a breaking way without a version bump.

## Migrations

Drizzle SQL, expand/contract only, generated via `pnpm db:generate`, run as a one-off ECS task pre-deploy (docs/07/08) — never hand-edit a migration once merged to `main`.

## Idempotency

Any handler touching `render_jobs` / render callbacks / SQS-triggered paths must tolerate redelivery — keyed on `flow_version_id` / `render_job_id`, per docs/03 §4.
