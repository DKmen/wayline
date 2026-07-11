---
name: wayline-project-management
description: Use when planning, sequencing, tracking, or closing Wayline product work across sprints, Plane tickets, dependencies, risks, and release gates.
---

# Wayline Project Management

Use this skill for portfolio-level delivery control. For a picked-up Plane ticket, use `wayline-workflow`; do not duplicate its branch, PR, or merge procedure.

## Required sources

Read `docs/11-roadmap-sprints.md`, the relevant product/design/security documents, and `docs/plane/wayline-v1-backlog.md` before changing a sprint or ticket. Treat `docs/superpowers/plans/2026-07-11-wayline-v1-sprint-delivery.md` as the technical delivery baseline.

## Planning loop

1. Convert one sprint objective into independently testable Plane child tickets. Each ticket needs a clear outcome, dependencies, acceptance checks, affected surface, and positive/negative test requirement.
2. Confirm the dependency order before putting tickets into a sprint. Move unready or blocked work forward; do not mark UI-only work ready when its contract or service dependency is unresolved.
3. Log any material change to scope, product decision, schedule, privacy posture, entitlement, or security behavior in the sprint's decision/risk section.
4. Use `wayline-workflow` only after a child ticket is startable.

## Sprint closeout

Close a sprint only when every committed ticket is Done or explicitly moved with a recorded reason, the sprint acceptance gate is demonstrated, and linked proof is present. Proof is CI, coverage, relevant Playwright evidence, required privacy/security negative tests, and a one-line outcome summary. A local demonstration or UI screenshot alone is insufficient.

## Boundaries

- Do not invent product scope, Plane states, ticket IDs, or external commitments; ask the user when the source documents do not decide them.
- Do not replace API authorization, entitlement, privacy, or test requirements with dashboard-only checks.
- Do not mark a ticket or sprint complete without evidence.

## Quick reference

| Need           | Action                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ |
| New work       | Add it to the correct sprint backlog, state dependencies, and create a Plane-ready ticket. |
| Scope change   | Record decision, affected tickets, delivery impact, and user approval.                     |
| Blocked ticket | Record blocker/owner/next check; move dependent work rather than hiding the block.         |
| Sprint end     | Check the acceptance gate and attach all verification evidence before closeout.            |
