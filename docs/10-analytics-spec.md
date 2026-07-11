# 10 · Viewer Activity Analytics

Framing (from market research): for internal teams this is **training compliance** — "who on the team has completed this walkthrough" — not marketing engagement. Bar to match: Supademo's per-step drop-off; opportunity: nobody frames it for compliance.

## 1. Principles

- Workspace-private: only members' activity, visible to admins (and creators for their own flows). No third-party trackers in product surfaces.
- Viewers are always authenticated members → events are user-attributed by design; no anonymous IDs, no fingerprinting.
- Server is source of truth; clients batch and retry; events are advisory (drop rather than block UX).

## 2. Event taxonomy (Zod schema in `packages/shared-types`)

Session envelope: `view_session {flow_version_id, mode: video|walkthrough}` opened lazily on first event.

| Event                                          | Emitted by           | Payload extras                                                     |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `session_start`                                | player / side panel  | viewport, extension version                                        |
| `video_play` / `video_seek` / `video_complete` | player               | position_ms; complete = ≥90% watched                               |
| `step_viewed`                                  | side panel           | step_order                                                         |
| `step_completed`                               | walkthrough engine   | step_order, resolve_confidence, ms_on_step                         |
| `step_skipped` / `step_retried`                | walkthrough controls | step_order, prior pause reason                                     |
| `paused_target_missing`                        | walkthrough engine   | step_order, url (recorded-domain only — no unexpected-URL leakage) |
| `report_opened` → creates `broken_step_report` | pause card / bar     | reason enum, comment                                               |
| `session_end`                                  | both                 | completed: bool, last_step_order                                   |

Transport: `POST /v1/events` batched (≤50, flush 5s/unload via `sendBeacon`); session-cookie auth; server stamps `user_id`/`workspace_id` from session (client-supplied identity is ignored).

## 3. Storage & aggregation

Raw → `view_events` (monthly partitions, 12-month retention); sessions → `view_sessions` ([04-data-model.md §analytics](./04-data-model.md#analytics)).

Nightly rollup (scheduled ECS task) + on-demand refresh for the open dashboard view:

- `flow_stats`: unique viewers, video completion rate, walkthrough starts/completions, median duration, per-step funnel `{step_order, viewed, completed, skipped, paused}`.
- `member_flow_completion`: first completion per (user, flow, mode) — the compliance table.
- Broken-step aggregation: open reports per step, grouped by reason.

## 4. Dashboard surfaces

### Flow analytics tab (creator + admin)

- Headline tiles: viewers, completion rate (video / walkthrough split), median time, open broken-step reports.
- **Step funnel**: horizontal bar per step (viewed → completed), skip/pause markers; the drop-off step is visually obvious — this is the "your step 7 is broken or confusing" signal.
- Viewers table: member, mode, started, completed?, last step.
- Broken-step reports list: step thumbnail, reason, reporter, URL, resolve action (links to editor for republish).

### Workspace analytics (admin; Team plan for export)

- Compliance matrix: members × flows, cells = completed (✓ + date) / started / —, filter by flow tag; CSV export from `member_flow_completion`.
- Trends: views & completions over time; most-viewed flows; flows with rising broken-step reports ("needs re-record" queue).

### Plan gating

| Capability                     | Free                             | Pro | Team |
| ------------------------------ | -------------------------------- | --- | ---- |
| View counts per flow           | ✅                               | ✅  | ✅   |
| Step funnel + viewer table     | —                                | ✅  | ✅   |
| Compliance matrix + CSV export | —                                | —   | ✅   |
| Broken-step reports            | ✅ (product safety, never gated) | ✅  | ✅   |

## 5. Creator notifications

- Broken-step report → email (SES) to flow creator, daily digest (immediate if ≥3 on same step).
- Weekly workspace digest (admin, opt-in): new completions, top flows, open reports.

## 6. Non-goals (v1)

No heatmaps, session replay, external-viewer analytics (no external viewers exist), Slack/LMS integrations, or predictive scoring. The event schema is deliberately extensible (`meta jsonb`) so these can land without migration churn.
