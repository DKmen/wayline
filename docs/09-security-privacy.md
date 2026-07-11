# 09 · Security & Privacy Model

Privacy is the product wedge ([00-product-brief.md](./00-product-brief.md)) — these are product requirements, not compliance chores.

## 1. The four guarantees (user-facing, stated in UI)

1. **Typed values are never captured.** Not stored, transmitted, rendered, or logged — there is no code path or schema column that could hold one.
2. **Drafts stay on this device.** Nothing uploads until the creator explicitly publishes.
3. **Publish requires redaction review.** Every heuristic warning must be resolved; redaction is destructive pixel blur applied client-side before upload.
4. **Wayline never acts for you.** Live walkthrough highlights and waits; it never clicks, types, or submits.

## 2. Threat-informed controls

### Capture & drafts (extension)

- Value-read ban: capture code reads element metadata only; ESLint rule forbids `.value`/`textContent` on form controls in `lib/capture/`; unit tests serialize every step shape and assert no captured input values; publish payload schema (Zod) has no field that could carry one.
- Sensitive-field flagging: password/CC/SSN-ish inputs (type, name, autocomplete, label heuristics) auto-create redaction warnings on the surrounding screenshot.
- Screenshot heuristics: client-side regex/pattern pass (emails, card-like numbers, key-like strings) over OCR-free DOM text near capture region generates warnings; creator resolves each (Redact / Keep as-is).
- Drafts in extension-origin IndexedDB — inaccessible to web pages; content-script overlay runs in an isolated world + shadow root.
- Org rule alignment: unmasked PII must not be retained — redaction-before-publish enforces this at the product level.

### AuthN/AuthZ

- Passwordless only (magic link via SES, Google OAuth). Magic links: single-use, 15-min expiry, token hash stored, rate-limited per email/IP.
- Server-side sessions (Postgres), HttpOnly Secure cookies on `.wayline.app`; extension uses the same cookie via host permission — no tokens in extension storage ([03-architecture.md §3.2](./03-architecture.md)).
- CSRF: custom header requirement + Origin allow-list (dashboard origin, extension ID). `externally_connectable` limited to `app.wayline.app`, carries no secrets.
- Authorization: every query workspace-scoped (lint-enforced helper); role guards per route; entitlement checks server-side inside transactions.
- Session lifetimes: 30d rolling; revocation UI in personal settings; sign-out kills server session → extension flips via `cookies.onChanged`.

### Assets

- S3 buckets private + OAC; delivery only via CloudFront **signed URLs, 5-min TTL**, minted after membership check. No permanent URLs; keys are unguessable but authorization never relies on that.
- Client uploads via presigned PUT scoped to content-hash key, size-capped, content-type-pinned.
- Encryption: TLS everywhere; S3 SSE-S3; RDS storage encryption enabled at creation.

### Extension platform posture (CWS compliance)

- Minimum permissions: `activeTab`, optional per-site host permissions at use time; never `<all_urls>` at install. Single-purpose listing; unobfuscated code; hosted privacy policy on the landing site; data-use disclosures match reality (URLs, interaction metadata, screenshots — collected only during explicit recording; never sold/shared).
- No operation on `chrome://`, store pages, or other extensions.
- Kill-switch flags (server-side) for capture and walkthrough independently, since CWS review latency prevents fast client fixes.

### API & infrastructure

- Input validation: Zod on every route; output filtering via serializer allow-lists.
- Rate limiting per session + IP (auth endpoints strictest); publish/upload endpoints size- and count-limited.
- Secrets in SSM SecureString; least-privilege task roles (api: RDS/SQS/SES/SSM/S3-prefix; worker: S3-prefix + callback only); OIDC-scoped CI roles; no long-lived AWS keys anywhere.
- Logging discipline: structured logs with an explicit field allow-list; no request bodies, no screenshots, no email contents; Sentry scrubbers on.
- Backups & DR per [07-aws-infrastructure.md](./07-aws-infrastructure.md); restore drill before launch.

## 3. Data lifecycle & retention

| Data                         | Where               | Retention                                                                                   |
| ---------------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| Local drafts                 | Extension IndexedDB | Until publish/discard; "delete all local data" control in extension settings                |
| Published flows/steps/assets | RDS + S3            | Until flow deleted; deletion cascades metadata + assets + video within 24h (background job) |
| Old published versions       | RDS + S3            | Pro keeps history; free keeps latest, superseded assets deleted after 7 days                |
| View events                  | RDS partitions      | Raw 12 months → rollups kept                                                                |
| Audit log                    | RDS                 | 24 months                                                                                   |
| Deleted workspace            | all                 | 7-day grace, then hard cascade                                                              |
| Magic-link tokens            | RDS                 | Hashed, purged at expiry                                                                    |

Account deletion: user delete removes memberships + personal data; sole-admin deletion requires workspace transfer or deletion first.

## 4. Legal/compliance runway (v1-appropriate)

- Privacy policy + ToS on landing (required by CWS before store listing).
- GDPR posture: EU users exist even for a US pilot — data-export endpoint (workspace JSON + assets manifest), deletion rights covered above, DPA template deferred until first request.
- SOC 2: not for v1; keep the audit log, least-privilege IAM, and change-management-via-PR habits that make it cheap later.

## 5. Security review cadence

- `/security-review` on every auth/upload/signing PR; full checklist pass before public launch (Sprint 11 gate in [11-roadmap-sprints.md](./11-roadmap-sprints.md)).
- Failure tests from [02-product-spec.md §6](./02-product-spec.md) run in CI: non-member 403s (metadata + assets), 4th-flow publish rejection, typed-value absence, expired signed URL rejection.
