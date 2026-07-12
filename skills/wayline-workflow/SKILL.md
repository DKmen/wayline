---
name: wayline-workflow
description: Use when starting, reviewing, merging, or closing a Wayline Plane ticket and its git branch or pull request.
---

# Wayline Workflow

Bridge Plane ticket state and proof to the repository's normal implementation, review, and branch-finishing disciplines. Do not duplicate those disciplines here.

## Pickup

1. Retrieve the Plane ticket and read its complete description, acceptance criteria, dependencies, and current state.
2. Confirm the ticket is startable (`Todo`), assigned, dependency-ready, and correctly labeled. Stop and record a blocker when those facts are not true.
3. Move it to `In Progress`.
4. Branch from latest `main` as `<type>/WAYLI-123-short-slug`; reuse the Conventional Commit type vocabulary.
5. Apply the relevant planning, TDD, implementation, and review skills. This skill only supplies the ticket context and Plane transitions.

## Review and QA

1. Run lint, typecheck, the full test suite with coverage, build, and relevant Playwright checks. Self-review the complete diff.
2. Move the ticket to `In Review` only when implementation and local evidence satisfy every acceptance criterion.
3. Open a PR whose title contains the ticket ID and whose body fills every field in `.github/PULL_REQUEST_TEMPLATE.md`.
4. Address review findings and require green CI.
5. Move the ticket to `Testing` only after independently confirming the ticket acceptance gate, not merely that tests execute.

## Merge and Closeout

After merge:

1. Verify the merged state and required checks on `main`.
2. Link the merged PR in Plane.
3. Attach the coverage summary tail, CI run URL, relevant Playwright report or visual evidence, required privacy/security negative-test evidence, and a one-line outcome summary.
4. Update dependency and risk records affected by the result.
5. Move the ticket to `Done` only when all proof is attached; then perform normal branch/worktree cleanup.

## Plane Operations

Use the live Plane tools to retrieve/update work items, list state UUIDs, create proof comments, and create PR links. Project: `Wayline` (`c7cda4d3-5901-4b60-ad05-fa108adf6384`), identifier: `WAYLI`. Never invent a state, ticket ID, or proof URL.

## Quick Reference

| Seam     | Plane action                                            |
| -------- | ------------------------------------------------------- |
| Pickup   | `Todo` → `In Progress` after readiness checks           |
| PR ready | `In Progress` → `In Review` after local verification    |
| QA ready | `In Review` → `Testing` after review and green CI       |
| Merged   | `Testing` → `Done` after merged-state proof is attached |

## Common Mistakes

- Leaving a ticket permanently open to represent recurring process work.
- Treating coverage percentage as proof that positive and negative cases are meaningful.
- Moving to `Done` before merge or without links and evidence.
- Creating a branch from stale `main` or using a non-`WAYLI` ticket scope.
- Replacing server-side authorization, workspace scope, entitlement, or privacy checks with UI-only evidence.
