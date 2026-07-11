# 00 · Wayline — Product Brief

> **Wayline** — _Every workflow, one line to follow._
> Private-by-default browser workflow capture for internal teams: one recording becomes a polished silent guided video **and** a live in-Chrome follow-along walkthrough.

## 1. Vision

Teams teach browser-based work constantly — onboarding a hire into the CRM, showing support how to issue a refund, walking ops through a billing export. Today that means meetings, raw screen recordings, or hand-assembled screenshots: slow to make, fast to rot, and disconnected from the app where the work actually happens.

Wayline turns **one normal pass through a task** into:

1. **A polished, silent, caption-led video** — animated cursor, target spotlight, dimmed context. No robotic AI voiceover; built for muted-Slack and open-office consumption.
2. **A live Chrome walkthrough** — the extension opens the real site, dims the page, highlights the exact element, and waits for the viewer to act. Wayline never clicks for you.

## 2. Positioning

> **Private-by-default browser workflow capture for internal teams, with a polished shareable video and a reliable live "follow along" experience from the same recording.**

The market research (see [01-market-research.md](./01-market-research.md)) confirms this combination does not exist at self-serve prices:

| Wedge                                      | Why it's open                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Video + live guidance from one capture** | Guide/video tools (Scribe, Guidde, Clueso) have zero live guidance. Live guidance over third-party apps is Enterprise-only (Tango "Guide Me") or a $24k–43k/yr DAP (Whatfix, WalkMe). |
| **Private by default**                     | iorad's free tier forces tutorials public; Scribe's privacy controls sit behind Pro. Wayline: drafts never leave the device until publish; published flows are workspace-only.        |
| **Redaction on the base tier**             | Scribe Smart Blur is Pro-gated and imperfect; Tango auto-blur is Enterprise-only. Redaction review that _blocks publish_ is a Wayline core feature, free.                             |
| **Deliberately silent video**              | The #1 complaint against Guidde/Clueso/Trupeer is robotic AI voiceover. Captions + motion sidestep it entirely.                                                                       |
| **Flat, transparent workspace pricing**    | Seat minimums (Scribe ×5, Tango ×3) and quote-only Enterprise cliffs are the category's top pricing resentment. Unlimited free viewers (iorad's one good idea) fits internal teams.   |

## 3. Personas

| Persona                     | Role                                                       | Needs                                                                                                                   |
| --------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Creator** (primary buyer) | Ops lead, support manager, onboarding/enablement, IT admin | Capture a process once, keep it private until reviewed, share something that looks professional, know it stays current. |
| **Viewer**                  | Any workspace teammate                                     | Learn the task fast — watch the video or be walked through the real app; never worry about clicking the wrong thing.    |
| **Workspace admin**         | Team lead / founder                                        | Invite members, control roles, see who has completed which walkthrough (training-compliance framing), manage the plan.  |

## 4. Pricing model (freemium)

Billing philosophy: **charge per workspace on creation volume; viewers are always free and unlimited.**

|                       | **Free**            | **Pro** (per workspace, flat) | **Team** (per creator seat)                 |
| --------------------- | ------------------- | ----------------------------- | ------------------------------------------- |
| Published flows       | **3 per workspace** | Unlimited                     | Unlimited                                   |
| Creators              | 1                   | 3                             | Unlimited (per-seat)                        |
| Viewers               | Unlimited           | Unlimited                     | Unlimited                                   |
| Silent guided video   | ✅                  | ✅                            | ✅                                          |
| Live walkthrough      | ✅                  | ✅                            | ✅                                          |
| Redaction review      | ✅                  | ✅                            | ✅                                          |
| Viewer analytics      | Views only          | Per-step drop-off, completion | + Compliance exports, broken-step SLA views |
| Video branding        | Wayline badge       | Custom logo/colors            | Custom + templates                          |
| Version history       | Latest only         | Full history + rollback       | Full history + rollback                     |
| Priority render queue | —                   | ✅                            | ✅                                          |

- Indicative price points (validate in pilot): Pro **$29/workspace/mo**, Team **$12/creator/mo** — deliberately under Scribe's $65/mo entry and Tango's $45/mo entry, above Trupeer's $19.
- Gate enforcement is an **entitlements service** from day one (see [04-data-model.md](./04-data-model.md#entitlements)); Stripe integration lands in a late sprint ([11-roadmap-sprints.md](./11-roadmap-sprints.md)) — the free tier works without billing code.
- Transparent pricing page (breaking the category's no-public-pricing convention) is itself a trust signal.

## 5. What v1 ships (scope)

**In scope** — everything in [02-product-spec.md](./02-product-spec.md):

- Chrome MV3 extension: capture, local drafts, live walkthrough side panel
- Web dashboard: flow library, step editor, redaction review, publish, video player
- Workspace management: passwordless email + Google sign-in, invites, roles (admin / creator / viewer)
- Viewer activity analytics: views, per-step drop-off, completion, broken-step reports
- Public landing page with waitlist → signup
- Freemium gating (3 free published flows), Stripe billing as final pre-launch sprint

**Out of scope for v1** (unchanged from original spec):

- Raw continuous tab/desktop recording, microphone/voiceover, browser automation or auto-clicking, public/anonymous share links, mobile, SSO/SAML, canvas-heavy apps, cross-origin iframe replay, non-Chrome browsers.

## 6. Success criteria (production pilot)

1. A new user goes from landing page → signed-in workspace → extension installed → **first published flow in under 15 minutes** (aha-before-invite; see onboarding in [02-product-spec.md](./02-product-spec.md#onboarding)).
2. A creator records, redacts, and publishes a real internal task with zero typed values ever stored.
3. A workspace member watches the video **and** completes the same task via live walkthrough.
4. The admin can see who completed the walkthrough in the analytics dashboard.
5. When the target site's UI changes, the walkthrough pauses safely with retry/skip/report — never guesses.
6. The whole system runs on AWS from IaC with CI/CD, alarms, and backups ([07-aws-infrastructure.md](./07-aws-infrastructure.md)).

## 7. Document map

| Doc                                                    | Contents                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| [01-market-research.md](./01-market-research.md)       | Competitor profiles, comparison matrix, gaps, onboarding & landing patterns |
| [02-product-spec.md](./02-product-spec.md)             | Full functional spec: journeys, onboarding, workspace mgmt, freemium gating |
| [03-architecture.md](./03-architecture.md)             | System architecture, auth flows, publish & render pipelines                 |
| [04-data-model.md](./04-data-model.md)                 | Postgres schema, entitlements, analytics events                             |
| [05-design-system.md](./05-design-system.md)           | Wayline brand tokens, screen inventory, mockup references                   |
| [06-extension-spec.md](./06-extension-spec.md)         | MV3 architecture, capture engine, target descriptors, walkthrough           |
| [07-aws-infrastructure.md](./07-aws-infrastructure.md) | AWS reference architecture, IaC, CI/CD, observability, cost                 |
| [08-local-dev.md](./08-local-dev.md)                   | Monorepo layout, docker-compose parity stack                                |
| [09-security-privacy.md](./09-security-privacy.md)     | Privacy model, permissions, Chrome Web Store compliance                     |
| [10-analytics-spec.md](./10-analytics-spec.md)         | Event taxonomy, dashboards, broken-step reporting                           |
| [11-roadmap-sprints.md](./11-roadmap-sprints.md)       | Sprint-by-sprint roadmap with acceptance criteria                           |
| [flow-recorder-v1.md](./flow-recorder-v1.md)           | **Superseded** original spec — kept for history; 02 replaces it             |
