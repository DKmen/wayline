# Flow Recorder v1

> **SUPERSEDED (2026-07-11).** This original spec is kept for history. The current documentation set starts at [README.md](./README.md) / [00-product-brief.md](./00-product-brief.md); the product is now **Wayline**, the functional core below was carried into [02-product-spec.md](./02-product-spec.md), and the referenced `flow-reliability-and-ai-design.md` no longer exists (its concerns were folded into 02 §3.7 and 06).

## Product Definition

Flow Recorder helps internal teams turn a browser task into two clear learning formats from one recording:

1. A polished, silent guided video with captions, cursor movement, a precise target spotlight, and dimmed page context.
2. A live Chrome walkthrough that opens the real website and guides a teammate through each action in place.

The product is for teams that repeatedly teach colleagues how to complete work in web applications: operations teams, support teams, onboarding leads, IT administrators, and enablement teams.

### Problem

Teams commonly explain browser workflows with meetings, raw screen recordings, or manually assembled screenshots. Those formats are slow to produce, difficult to keep clear, and make the learner switch between instructions and the actual application.

Flow Recorder makes one guided pass through a task into reusable documentation, a visually focused video, and an interactive on-screen walkthrough.

### Product Positioning

The category already includes automated guide tools such as Scribe, Tango, and Supademo. Flow Recorder’s v1 position is:

> Private-by-default browser workflow capture for internal teams, with a polished shareable video and a reliable live “follow along” experience from the same recording.

The product does not compete initially on public marketing demos, automation, broad integrations, or enterprise deployment. It competes on a focused and trustworthy capture-to-guidance loop.

## Goals and Non-Goals

### Goals

- Let a creator capture a normal browser workflow without manually taking screenshots or drawing annotations.
- Keep the draft local until the creator explicitly publishes it.
- Produce an attractive, silent, caption-led video from reviewed workflow steps.
- Let authenticated workspace members follow the workflow inside Chrome with in-page highlighting.
- Prevent captured typed values from being retained and require sensitive-content review before sharing.
- Fail safely when a website changes instead of guessing or clicking for the viewer.

### Non-Goals for v1

- Raw, continuous tab or desktop recording.
- Microphone capture, AI voiceover, or audio editing.
- Browser automation, auto-clicking, form filling, or password handling.
- Public/anonymous share links.
- Mobile browser support.
- Native desktop-app recording.
- Canvas-heavy applications, Chrome internal pages, or dependable replay through complex cross-origin iframes.
- Enterprise SSO, customer-hosted deployment, advanced analytics, and broad third-party integrations.

## Users and Access

### Creator

A workspace member who knows a process and records, edits, redacts, and publishes a flow.

### Viewer

An authenticated member of the same workspace who watches a published video or follows a live walkthrough through the Chrome extension.

### Workspace

The security boundary for all published content. A flow is visible only to members of its workspace. The first release uses passwordless email sign-in; SSO is deferred.

## Core User Journeys

### 1. Record a workflow

1. The creator opens a supported web app in Chrome and opens Flow Recorder.
2. The extension explains what is collected: page URLs, interaction metadata, and screenshots; it states that typed values are never kept.
3. The creator grants access to the current site and presses **Start capture**.
4. The creator completes the task normally. The extension records meaningful clicks, selections, form interactions, and navigation.
5. A compact capture control allows pause, resume, finish, or discard.
6. On **Finish**, the extension saves a local draft and opens it in the dashboard editor.

### 2. Review and publish

1. The dashboard displays an ordered timeline of steps with screenshots, draft instructions, and redaction status.
2. The creator edits instructions, changes the title, reorders, merges, deletes, or adds manual steps.
3. The creator applies blur/redaction to screenshots and resolves every privacy warning.
4. The creator previews the spotlight/video treatment.
5. The creator selects the workspace and presses **Publish**.
6. Only the reviewed flow assets and metadata are uploaded. The workspace receives an interactive guide and a generated video.

### 3. Watch the video

1. A workspace member opens a published flow in the dashboard.
2. The page plays a silent guided-step video with captions, cursor movement, a target outline, and a dimmed background.
3. The viewer can jump between individual steps in the video timeline.

### 4. Follow live in Chrome

1. The viewer opens a flow and chooses **Follow live**.
2. If needed, the product asks the viewer to install/sign in to the extension.
3. The extension opens the flow’s starting URL and shows a side panel with the first step.
4. The extension identifies the intended page target, dims the rest of the page, and highlights the target with a clear instruction.
5. The viewer performs the action themselves; the extension observes the expected result and advances.
6. If the target cannot be confidently identified, the flow pauses and shows the reference screenshot with **Retry**, **Skip**, and **Report broken step** actions.

## Functional Requirements

### Chrome extension

- Use Manifest V3 and support Chrome desktop only.
- Provide popup controls for start, pause, resume, finish, and discard.
- Provide a side panel for live walkthrough instructions and step progress.
- Request host access only as needed for recording or replay. Prefer `activeTab` and optional host permissions over permanent broad access.
- Never operate on Chrome internal pages or unsupported browser surfaces.

### Capture behavior

- Capture meaningful actions: click, change, selection, submit, and top-level navigation.
- Ignore pointer movement, focus-only changes, repeated events, and low-value interaction noise.
- Create one ordered step per meaningful action after the page has settled sufficiently for a useful visual state.
- Capture the current URL, page title, viewport size, screenshot, target geometry, action type, expected action, and target descriptor.
- For text fields, record only the action and a safe instruction such as “Enter work email”; never save the typed value.
- Mark likely sensitive content for review using field type/name, label text, and basic visual/text heuristics.

### Step data

Each `Step` includes:

| Field                 | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `id` and `order`      | Stable identity and sequence in a flow.                 |
| `instruction`         | Editable human-readable action.                         |
| `action`              | Expected viewer action, such as click or input.         |
| `url` and `pageTitle` | Navigation context.                                     |
| `viewport`            | Original screenshot dimensions.                         |
| `screenshotAsset`     | Reviewed visual state for guide and video.              |
| `targetBounds`        | Target rectangle in source viewport coordinates.        |
| `targetDescriptor`    | Multi-signal description used to find the element live. |
| `redaction`           | Clear, warning, or resolved status and reason.          |

### Target descriptor and matching

Capture multiple signals rather than relying on a fixed rectangle. Prefer the following evidence in order:

1. Explicit stable test ID.
2. ARIA role and accessible name.
3. Associated form label.
4. Meaningful visible text and element type.
5. CSS/DOM path fallback.
6. Recorded geometry as a validation signal, not as the primary identifier.

During live guidance, score candidate elements using this evidence. Show the highlight only if the score reaches a safe confidence threshold. Never auto-click, type, or continue on a weak match.

### Editor and publishing

- Save drafts locally in extension-controlled storage until publish.
- Allow title/instruction editing, step reordering, merging, deletion, and manual-step insertion.
- Allow screenshot blur/redaction and clearly indicate unresolved warnings.
- Block publishing while any step has unresolved redaction warnings.
- On publish, upload the reviewed flow package to the selected workspace and create immutable published assets for that version.

### Guided video

- Generate a silent, caption-led MP4 from reviewed screenshots and step metadata.
- Animate cursor motion between target positions.
- Scale target bounds from each source viewport to the output frame before drawing the spotlight.
- Use a target outline and subtle background dimming/blur; do not use arbitrary fixed boxes.
- Include step number and editable instruction as the on-screen caption.
- Provide a web player with step-level seek/navigation.

### Live walkthrough

- Open the relevant recorded URL for each step when navigation is required.
- Render an extension-owned overlay with a dimmed backdrop, target outline, instruction tooltip, and accessible side-panel controls.
- Detect completion only from the viewer’s observed action; do not perform actions on the viewer’s behalf.
- Support retry, skip, exit, and report-broken-step.
- Treat a changed DOM, missing target, unsupported page, denied permission, or failed navigation as recoverable pause states.

## Architecture

### Client surfaces

| Component                       | Responsibility                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Chrome extension service worker | Recording session state, permissions, local drafts, navigation coordination, and messaging. |
| Content script                  | Event capture, target description, screenshot coordination, and live page overlay.          |
| Extension side panel            | Viewer instructions, progress, fallback controls, and reporting.                            |
| Web dashboard                   | Workspace sign-in, flow library, editor, publish controls, video player, and team access.   |

### Backend services

| Service                        | Responsibility                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Identity and workspace service | Passwordless email sign-in, membership, and authorization.                             |
| Flow API                       | Flow metadata, ordered steps, publishing, versioning, and viewer permissions.          |
| Private asset storage          | Screenshots, approved redactions, and rendered video assets.                           |
| Render worker                  | Builds an MP4 from approved step screenshots, captions, geometry, and motion timeline. |
| Signed asset delivery          | Gives authenticated workspace viewers time-limited access to private media.            |

### Data lifecycle

1. Capture assets and draft metadata remain on the creator’s device.
2. The creator reviews and explicitly publishes a selected draft.
3. The dashboard uploads only reviewed data to private workspace storage over HTTPS.
4. The rendering worker produces the video from those approved assets.
5. Workspace members access the guide and media only after authorization.
6. Deleting a published flow removes its metadata, assets, and generated video according to the product retention policy.

## Privacy and Security

- Give a clear, in-product disclosure before collecting page content, screenshots, URLs, or interaction metadata.
- Use the minimum Chrome permissions required for the currently requested feature.
- Do not capture, persist, transmit, render, or log typed form values.
- Identify likely secrets and personal information for review; creators must resolve warnings before publishing.
- Encrypt all published-data transfers with TLS and encrypt cloud data at rest.
- Keep content private to authenticated workspace members; no anonymous share links in v1.
- Do not expose direct permanent asset URLs; use authorization checks and short-lived signed delivery URLs.
- Provide deletion controls for drafts and published flows.

This design must follow Chrome Web Store minimum-permission and user-data requirements. Useful implementation references are [Chrome’s optional permissions guidance](https://developer.chrome.com/docs/extensions/reference/api/permissions), [content-script guidance](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), and the [Chrome Web Store user-data policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).

## Compatibility and Failure Handling

### Supported in v1

- Chrome desktop.
- One browser tab at a time.
- Standard DOM-based websites and web applications where the target is exposed in the document structure.

### Unsupported or limited in v1

- `chrome://` pages and other browser-controlled surfaces.
- Canvas-driven interfaces and virtualized visual surfaces without reliable DOM targets.
- Complex cross-origin iframes and interactive content embedded from another site.
- Native desktop applications, mobile browsers, audio/video capture, and automated action replay.

### Safe failure behavior

| Situation                    | Product behavior                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| No permission                | Explain why access is needed and offer retry; do not collect data.                        |
| Unsupported page             | Prevent capture/live guide and explain the limitation.                                    |
| UI changed or target missing | Pause with reference screenshot; let the viewer retry, skip, or report.                   |
| Multiple weak target matches | Do not highlight or advance; ask the viewer to retry or skip.                             |
| Redaction warning            | Keep the draft local and block publish until the warning is resolved.                     |
| Viewer session ends          | Preserve completed progress locally for the session; do not perform queued actions later. |

## Success Criteria

The v1 is ready for an internal pilot when a creator can:

1. Record a standard web-app task in Chrome.
2. Review and redact the generated steps without exposing typed values.
3. Publish the flow to a private workspace.
4. Share a viewable guided video with a workspace member.
5. Let that member complete the same workflow through the extension’s live highlights.
6. Receive a safe, understandable fallback if the website has changed.

## Acceptance and Test Checklist

### Unit tests

- Normalize and group capture events without creating duplicate steps.
- Verify input values never appear in stored steps, serialized drafts, logs, or publish payloads.
- Verify target descriptor preference order and candidate confidence scoring.
- Verify redaction warnings block publishing until resolved.
- Verify source viewport coordinates scale correctly into video-frame coordinates.

### Integration tests

- Record click, input, selection, and SPA navigation on a representative test web app.
- Edit, reorder, merge, redact, and publish a draft.
- Authorize a workspace member and reject a non-member from guide and media access.
- Generate a video and verify its caption, spotlight, dimming, and target position against source screenshots.
- Open a live guide, resolve a target, perform the expected action, and advance the step.

### Failure tests

- Denied/revoked host permission.
- Unsupported URL or page type.
- Missing target after UI change.
- Ambiguous target match.
- Unresolved redaction warning.
- Failed navigation and a viewer choosing retry, skip, or exit.

## Future Direction

After v1 reliably proves the capture-to-guidance loop, evaluate raw tab recording, voiceover, guided analytics, enterprise SSO, browser support beyond Chrome, richer iframe/canvas support, public controlled links, and optional automation. None of these should weaken the v1 privacy model or the rule that live guidance never acts on behalf of the viewer.

## Reliability Design

The detailed reliability model, edge-case taxonomy, deterministic fallback behavior, and optional AI-review policy are defined in [Flow Recorder Reliability and AI Design](./flow-reliability-and-ai-design.md). It is the implementation reference for making flows safe to record, publish, and follow when websites, permissions, sessions, or interface states change.
