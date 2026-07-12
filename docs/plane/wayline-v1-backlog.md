# Wayline v1 — Plane-Ready Backlog

Create one Plane parent per sprint using the names below. Create the listed child tickets beneath the matching parent; assign the actual Plane IDs only after the project is connected.

## Plane implementation record

- Workspace: `WAYLI`
- Project: `Wayline` (`c7cda4d3-5901-4b60-ad05-fa108adf6384`)
- Created from source: `wayline-v1-plan-2026-07-11`
- Planned hierarchy after the WAYLI-84 local-first rebaseline: 14 sprint epics + 67 child tasks = 81 work items
- S0 is `Done`; S1 is active (`WAYLI-27` is `Todo`); S2–S13 remain dependency-gated (`Backlog`).

| Sprint | Epic       | Child work items                  |
| ------ | ---------- | --------------------------------- |
| S0     | `WAYLI-9`  | `WAYLI-21`–`WAYLI-26`             |
| S1     | `WAYLI-10` | `WAYLI-27`–`WAYLI-30`             |
| S2     | `WAYLI-8`  | `WAYLI-31`–`WAYLI-34`             |
| S3     | `WAYLI-13` | `WAYLI-35`–`WAYLI-39`             |
| S4     | `WAYLI-15` | `WAYLI-40`–`WAYLI-44`             |
| S5     | `WAYLI-14` | `WAYLI-45`–`WAYLI-50`             |
| S6     | `WAYLI-16` | `WAYLI-51`–`WAYLI-55`             |
| S7     | `WAYLI-12` | `WAYLI-56`–`WAYLI-59`             |
| S8     | `WAYLI-11` | `WAYLI-60`–`WAYLI-63`             |
| S9     | `WAYLI-17` | `WAYLI-64`–`WAYLI-68`             |
| S10    | `WAYLI-85` | `WAYLI-83`, `WAYLI-86`–`WAYLI-89` |
| S11    | `WAYLI-18` | `WAYLI-69`–`WAYLI-73`             |
| S12    | `WAYLI-19` | `WAYLI-74`–`WAYLI-78`             |
| S13    | `WAYLI-20` | `WAYLI-79`–`WAYLI-82`             |

## Parent tickets

| Parent title                              | Child-ticket groups                                                                                        | Dependency |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| S0 — Foundations                          | Shared contracts; local stack; CI; UI foundation; fixture; delivery control                                | None       |
| S1 — Auth and workspaces                  | Auth; tenancy; role guards; dashboard shell                                                                | S0         |
| S2 — Extension session bridge             | Extension shell; cookie bridge; permissions; onboarding detection                                          | S1         |
| S3 — Capture and local drafts             | Capture; screenshots; descriptors; IndexedDB; draft library                                                | S2         |
| S4 — Editor and redaction                 | Editor; history; redaction; publish blocker                                                                | S3         |
| S5 — Publish and video                    | Publish API; assets; renderer; player; signed delivery                                                     | S4         |
| S6 — Live walkthrough                     | Resolver; walkthrough controls; spotlight; follow-live entry                                               | S5         |
| S7 — Safe failure and reports             | Pause cards; reporting; completion; resume                                                                 | S6         |
| S8 — Analytics                            | Events; rollups; flow analytics                                                                            | S7         |
| S9 — Team and onboarding                  | Invites; roles; settings; checklist                                                                        | S8         |
| S10 — Cloud Foundation and Dev Deployment | AWS foundation; managed data/media adapters; API/worker cloud deploy; protected CI/CD; dev acceptance gate | S9         |
| S11 — Landing and freemium                | Landing; legal; entitlements; upgrades                                                                     | S10        |
| S12 — Billing and hardening               | Stripe; resilience; security; DR                                                                           | S11        |
| S13 — Pilot and launch                    | CWS; pilot; observability; release                                                                         | S12        |

## Ticket template

Use this description structure for every child ticket:

1. Outcome and user value.
2. In-scope behavior and explicit non-goals.
3. Dependencies and interfaces consumed/produced.
4. Acceptance criteria, including role/workspace/entitlement rules where relevant.
5. Positive and negative test scenarios.
6. Closeout proof: CI, coverage, Playwright/visual evidence where relevant, security/privacy evidence, and merged PR link.

## Required labels

Apply exactly one area label (`dashboard`, `api`, `extension`, `worker`, `infra`, `landing`, `shared`) and any applicable control labels (`privacy`, `security`, `entitlement`, `analytics`, `onboarding`, `release`).

## Status rules

- `Todo`: scoped and dependency-checked.
- `In Progress`: startable, assigned, and branched through `wayline-workflow`.
- `In Review`: acceptance implementation and verification evidence are ready for review.
- `Testing`: CI is green and the acceptance gate awaits final QA confirmation.
- `Done`: merged, evidence attached, and dependencies/risks updated.
