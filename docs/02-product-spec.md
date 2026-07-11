# 02 · Wayline Product Specification (supersedes flow-recorder-v1.md)

This spec carries forward the validated core of the original v1 spec (capture → review/redact → publish → video + live walkthrough) and adds the production-scope items: landing page, onboarding, workspace management, viewer analytics, and freemium gating.

## 1. Product surfaces

| Surface                           | What it is                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Landing site** (`wayline.app`)  | Public marketing site: positioning, how-it-works, pricing, waitlist/signup. Static, SEO-indexed.                                |
| **Dashboard** (`app.wayline.app`) | Authenticated SPA: flow library, step editor, redaction review, publish, video player, analytics, workspace & billing settings. |
| **Chrome extension**              | MV3: capture engine (popup + floating pill), local draft storage, live walkthrough (side panel + page overlay).                 |
| **API** (`api.wayline.app`)       | TypeScript service: auth, workspaces, flows, publishing, signed asset delivery, analytics ingest, entitlements.                 |
| **Render worker**                 | Async ffmpeg pipeline: approved step assets → silent captioned MP4.                                                             |

## 2. Roles and access

| Role        | Can                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Viewer**  | Watch published videos, run live walkthroughs, report broken steps.                                                             |
| **Creator** | Everything a viewer can + record, edit drafts, publish, manage own flows.                                                       |
| **Admin**   | Everything a creator can + invite/remove members, change roles, manage plan/billing, delete any flow, view workspace analytics. |

- Workspace is the security boundary. A flow is visible only to members of its workspace. No public/anonymous links in v1.
- First user of a workspace is its admin. Sign-in: **passwordless email magic link** or **Google OAuth** (no passwords anywhere).

## 3. User journeys

### 3.1 Landing → signup (new workspace) <a name="landing-page"></a>

Landing page (per [01-market-research.md §5](./01-market-research.md#5-landing-page-conventions-and-where-wayline-deviates)):

1. **Hero**: "Record it once. Teach it forever." Sub-line: one capture → a polished silent video + a live walkthrough in the real app. Dual CTA: **Get Wayline free** / **Watch 90-second demo**. Visual: split-screen of the same flow as video player and as in-page spotlight.
2. **How it works** (3 steps): Record normally → Review & redact → Publish video + walkthrough.
3. **Privacy block (elevated)**: "Drafts never leave your device. Typed values are never captured. Publish only after redaction review." Links to security page.
4. Feature pillars → use-case spotlights (onboarding, support, ops, IT) → testimonials (post-pilot) → transparent pricing table → footer.
5. Pre-launch mode: CTA swaps to **Join the waitlist** (email capture → `waitlist` table → invite emails).

Signup flow:

1. Email → magic link (SES) or Google → lands in dashboard.
2. Create workspace (name, slug auto-suggested from email domain).
3. Onboarding checklist appears (see 3.2).

### 3.2 First-run onboarding <a name="onboarding"></a>

Design rule: **aha before invite** — the user publishes a first flow before we ask for teammates or money.

Dashboard onboarding checklist (persistent card until complete):

1. **Install the extension** — CWS link; dashboard detects installation via `externally_connectable` ping and checks it off live.
2. **Record your first flow** — button deep-links to the extension popup with a suggested practice task; empty-state copy teaches by doing.
3. **Review & publish it** — editor tour (3 tooltips: caption editing, redaction panel, publish button).
4. **Watch it / follow it live** — viewer experience on their own flow.
5. _(only now)_ **Invite your team** — invite modal, role picker.

Extension first-run: after install, opening the popup with no session shows **Sign in on wayline.app** (opens dashboard; extension picks up the session automatically — see [03-architecture.md §auth](./03-architecture.md)). Popup has exactly one primary action: **Start capture**.

### 3.3 Record a workflow

1. Creator opens the target web app, opens the Wayline popup.
2. Disclosure card: what is collected (URLs, interaction metadata, screenshots), what never is (typed values). Grant per-site permission (optional host permission, not `<all_urls>`).
3. **Start capture** → floating pill appears on-page (per design PDF 2c): recording state, step counter, elapsed time, pause/resume, undo-last-step, redact-now, **Finish & review**, discard.
4. Extension records meaningful actions only (click, change, select, submit, top-level and SPA navigation), one step per action after page settle. Screenshot per step (throttled ≤2/s — Chrome hard quota).
5. Text fields: record action + safe generated instruction ("Enter work email") — **never the typed value**.
6. **Finish** → local draft saved (IndexedDB) → dashboard editor opens.

### 3.4 Review, redact, publish <a name="editor"></a>

Editor (per design PDF 2b — filmstrip left, canvas center, inspector right):

- Filmstrip: drag-to-reorder, merge adjacent, delete, insert manual step; steps with warnings badged ⚠.
- Canvas: screenshot with target outline; draw/erase redaction rectangles (irreversible pixel blur on publish, not overlay).
- Inspector: caption (auto-written, editable — shown in video and guide), target descriptor summary with confidence, redaction review queue.
- **Undo/redo across all edit operations** (top G2 complaint against every incumbent — non-negotiable).
- Redaction review: heuristic warnings (emails, names, numbers that look like secrets/PII in screenshots; sensitive field types) each require **Redact / Keep as-is** resolution. **Unresolved warnings block Publish** — button disabled with count.
- Publish: choose workspace → shows plan usage ("2 of 3 free flows used") → uploads only reviewed assets + metadata → creates immutable published version → queues video render.
- Republish creates version n+1; viewers always get the latest; Pro keeps history/rollback.

### 3.5 Watch the video

- Flow page in dashboard: player with silent captioned MP4 (cursor motion, target spotlight, dimmed context, step number + caption).
- Filmstrip chapters under the player (design PDF 2e): click a step to seek. Speed control, keyboard nav.
- Sidebar: step list as a readable text guide (screenshot + caption per step) — doubles as the "screenshot guide" format for skimmers.
- **Follow live in Chrome** button (primary, top-right).

### 3.6 Follow live in Chrome

1. Viewer clicks **Follow live** → if extension missing/signed-out, guided install/sign-in interstitial.
2. Extension opens the flow's starting URL; side panel shows step 1 of N, instruction, progress.
3. Content script resolves the target via descriptor scoring ([06-extension-spec.md](./06-extension-spec.md#target-resolution)); if confidence ≥ threshold: dim page, spotlight target, tooltip with instruction ("← click this button").
4. Viewer performs the action themselves; extension observes the expected result and advances. **Wayline never clicks, types, or navigates for the viewer** beyond opening step URLs.
5. Bottom bar (design PDF 2d): step x/N, Retry, Skip step, ⚑ Report, Exit.
6. Completion screen: ✅ + "mark as done" (feeds compliance analytics).

### 3.7 Safe failure (design PDF 2f — pause cards)

| Situation                                                      | Behavior                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Target missing / UI changed                                    | Pause card with the step's reference screenshot: Retry / Skip / Report broken step.                                 |
| Multiple weak matches                                          | Same pause card; never highlight a guess.                                                                           |
| Unsupported page (`chrome://`, canvas UI, cross-origin iframe) | Explain limitation; Back to steps / Exit. Nothing captured or read.                                                 |
| Permission not granted                                         | Per-site permission card: "Allow Wayline on this site?" — Allow & retry / Not now. Nothing collected until allowed. |
| Failed navigation / session ends                               | Preserve progress locally for the session; resume prompt on return.                                                 |
| Render failure                                                 | Flow page shows guide view + "video is being regenerated"; creator notified; auto-retry with backoff.               |

### 3.8 Workspace management

- **Members page**: list (name, email, role, last active), role changes (admin only), remove member.
- **Invites**: email invite with role; magic-link acceptance joins the workspace; pending invites listable/revocable. Invitees who aren't users yet get account creation in the same flow.
- **Settings**: workspace name/slug, plan & usage (flows published vs limit, creator seats), billing portal (Stripe, late sprint), danger zone (delete workspace → cascading delete with 7-day grace).

### 3.9 Analytics (viewer activity)

Full spec in [10-analytics-spec.md](./10-analytics-spec.md). Product-level requirements:

- Per-flow: total viewers, video watch-through, walkthrough starts/completions, **per-step drop-off funnel**, broken-step reports with step + timestamp + URL.
- Per-member (admin, Team plan): which flows completed — training-compliance table with CSV export.
- Events are workspace-private, aggregated in the dashboard; no third-party analytics on viewer content pages.

## 4. Freemium gating behavior

- Free workspace: max **3 published flows** (drafts unlimited — they're local anyway), 1 creator.
- Hitting the limit: Publish button becomes **Upgrade to publish** with plan modal; existing flows keep working (no hostage-taking).
- Entitlement checks are server-side (API) with client hints for UI; see [04-data-model.md](./04-data-model.md#entitlements).
- Downgrade: flows beyond limit stay viewable but locked for republish until under limit.

## 5. Functional requirements carried forward unchanged

These sections of the original spec remain authoritative as written there and are refined in the linked docs:

- Capture behavior, step data shape, target descriptor priority (test-id → role+name → label → text+type → CSS path; geometry as validation only) → [06-extension-spec.md](./06-extension-spec.md)
- Guided video generation rules (scale bounds from source viewport to output frame; spotlight + dim; caption = step number + instruction) → [03-architecture.md §render](./03-architecture.md)
- Privacy/security requirements → [09-security-privacy.md](./09-security-privacy.md)
- Compatibility limits and safe-failure taxonomy → §3.7 above

> Note: the original spec referenced `flow-reliability-and-ai-design.md`, which no longer exists. Its concerns (reliability model, fallback taxonomy) are folded into §3.7 here and [06-extension-spec.md](./06-extension-spec.md). If a deeper AI-assisted-review policy is wanted later, write it as a new doc.

## 6. Acceptance criteria (v1 pilot gate)

1. Landing → workspace → extension → **first published flow < 15 min** for a new user.
2. Input values never appear in steps, drafts, logs, payloads, or rendered video (automated test — [11-roadmap-sprints.md](./11-roadmap-sprints.md)).
3. Redaction warnings block publish until resolved.
4. Video caption/spotlight positions match source geometry across viewport sizes.
5. Live walkthrough completes a 10+ step real-world flow; UI-change produces the pause card, never a wrong highlight.
6. Non-members receive 403 on flow metadata **and** assets (signed URL scoping).
7. Free workspace cannot publish a 4th flow via UI or direct API call.
8. Admin sees viewer completion within 60s of a walkthrough finishing.
