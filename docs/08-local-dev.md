# 08 · Local Development & Monorepo

## 1. Why not LocalStack (decision, July 2026)

LocalStack killed its free Community Edition (March 2026): the free "Hobby" tier is **non-commercial only**, and the services we'd actually want emulated (ECS/RDS/CloudFront) sit in the $89/user/mo Ultimate tier. More importantly, **nothing in our stack needs cloud emulation locally**:

- ECS is just our own Docker containers → run them in compose.
- RDS is just Postgres → `postgres:16` image is exact engine parity.
- CloudFront is transparent to app code.
- The AWS SDK v3 supports endpoint overrides for everything else.

**Pattern: thin app-layer ports + endpoint-override config + a real AWS `dev` account for the things no emulator gets right (IAM, SES deliverability, signed URLs).**

## 2. docker-compose parity stack

| Prod service         | Local stand-in                                                                             | Notes                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RDS Postgres 16      | `postgres:16`                                                                              | identical                                                                                                                                               |
| SQS                  | **ElasticMQ** (`softwaremill/elasticmq`)                                                   | SQS-compatible REST; SDK endpoint override only. Actively maintained.                                                                                   |
| S3 + signed URLs     | **MinIO** (`minio/minio:RELEASE.2025-09-07T16-13-09Z`) or Garage                           | MinIO project is archived (April 2026); this is the last confirmed pre-archival tag — a zero-risk pinned dev dependency, swap to Garage if it bit-rots. |
| SES                  | **Mailpit** (SMTP) via a mailer port: `SesMailer` in prod, `SmtpMailer` locally            | Web UI at :8025 to click magic links. (`aws-ses-v2-local` is the alternative if we'd rather keep the SES SDK path.)                                     |
| Lambda render worker | same worker code run as a long-poll consumer container (`pnpm --filter render-worker dev`) | one `handler(job)` core, two entrypoints: Lambda adapter + poll loop                                                                                    |
| CloudFront signing   | dev flag: API returns direct MinIO presigned URLs                                          | signing code paths covered by integration tests against the dev AWS account                                                                             |

```yaml
# docker-compose.yml (root)
services:
  db: { image: postgres:16, ports: ['5432:5432'], environment: { POSTGRES_PASSWORD: wayline } }
  sqs: { image: softwaremill/elasticmq-native:1.6.9, ports: ['9324:9324'] }
  s3:
    {
      image: minio/minio:RELEASE.2025-09-07T16-13-09Z,
      command: server /data --console-address ":9001",
      ports: ['9000:9000', '9001:9001'],
    }
  mail: { image: axllent/mailpit:v1.30.4, ports: ['8025:8025', '1025:1025'] }
```

All four images are pinned to a specific tag — no `:latest` — so the parity stack can't silently drift. Run `pnpm stack:health` (§5) after `docker compose up -d` to confirm every service is actually reachable.

`pnpm dev` (turbo) starts: compose stack, API with `.env.local` endpoint overrides, dashboard Vite server, WXT dev browser with the extension pre-loaded, worker in poll mode, and a **fixture web app** (`apps/fixture`) — a small SPA with shadow DOM/iframe/nav cases used for capture & walkthrough development and Playwright tests.

## 3. Monorepo layout (pnpm workspaces + Turborepo)

```
wayline/
├─ apps/
│  ├─ extension/        # WXT (MV3)
│  ├─ dashboard/        # Vite + React + TanStack + shadcn/ui
│  ├─ landing/          # Astro static
│  ├─ api/              # Hono + Better Auth + Drizzle
│  ├─ render-worker/    # ffmpeg+sharp; Lambda + poll entrypoints
│  └─ fixture/          # test target web app (dev/test only)
├─ packages/
│  ├─ shared-types/     # Zod schemas: Step, TargetDescriptor, events, entitlements
│  ├─ ui/               # tokens + shared shadcn components (dashboard ⇄ extension surfaces)
│  └─ config/           # env validation (createEnv), env-fragment schemas, stack-health checks
├─ infra/               # OpenTofu (see 07)
├─ docs/                # this documentation set
├─ docker-compose.yml
├─ turbo.json
└─ pnpm-workspace.yaml
```

Rules:

- `packages/shared-types` is the single source of truth for wire shapes; API validates with the same Zod schemas the clients import. No hand-duplicated types.
- Node 22 pinned via `.nvmrc` + `engines`; pnpm via corepack.
- Turborepo tasks: `build`, `dev`, `lint`, `typecheck`, `test:e2e`; remote caching optional later. `test`/`test:coverage` deliberately bypass turbo — one shared root Vitest config (WAYLI-22), not per-package.

## 4. Environment configuration

- `packages/config` exports a Zod-validated `env.ts` per app — boot fails loudly on missing vars. Shared enum fragments (`mailerModeSchema`, `assetUrlModeSchema`) compose into each app's schema via the `createEnv` helper so `MAILER`/`ASSET_URL_MODE` aren't hand-duplicated per app.
- `.env.example` (root, committed) documents every variable and its local-stack default; copy to `.env.local` (gitignored) for local; ECS task-definition env + SSM `secrets` in AWS. Same variable names everywhere; only values differ (e.g. `S3_ENDPOINT`, `SQS_ENDPOINT`, `MAILER=smtp|ses`, `ASSET_URL_MODE=presign|cloudfront`).
- Never commit secrets; `gitleaks` hook in CI.

## 5. Developer workflows

| Task                       | Command                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full stack up              | `docker compose up -d && pnpm dev`                                                                                                                                                  |
| Verify parity stack is up  | `pnpm stack:health` (checks postgres/elasticmq/minio/mailpit, exit 0 iff all reachable)                                                                                             |
| DB migrate / new migration | `pnpm db:migrate` / `pnpm db:generate` (Drizzle Kit)                                                                                                                                |
| Seed demo data             | `pnpm db:seed` (demo workspace, 2 flows, fake events)                                                                                                                               |
| Unit tests                 | `pnpm test` (Vitest, full-repo — one shared root config, not per-package)                                                                                                           |
| Storybook (`packages/ui`)  | `pnpm --filter @wayline/ui dev` (one-time setup: `npx playwright install chromium`, needed for `pnpm --filter @wayline/ui test:storybook`'s real-browser a11y/contrast checks)      |
| E2E                        | `pnpm test:e2e` (Playwright, `@wayline/fixture` — currently the fixture's own pages only; extension-loaded + dashboard-flow suites are Sprint 1+/2 additions once those apps exist) |
| Extension dev              | `pnpm --filter extension dev` (WXT launches Chromium with extension)                                                                                                                |
| Load extension manually    | `pnpm --filter extension build` → load `dist/` unpacked                                                                                                                             |
| Deploy dev env             | GitHub Actions `workflow_dispatch` → dev account                                                                                                                                    |

## 6. Quality gates (repo-wide, from Sprint 0)

- TypeScript `strict`; ESLint + custom rules: no `.value` reads in `apps/extension/lib/capture/`, no unscoped (missing `workspace_id`) Drizzle queries in `apps/api`.
- CI required checks: lint, typecheck, unit, build, e2e-smoke.
- Conventional commits → changelog; extension version bumps via `ext-v*` tags ([07 §CI/CD](./07-aws-infrastructure.md)).
