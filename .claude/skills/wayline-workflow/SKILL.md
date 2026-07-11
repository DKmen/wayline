---
name: wayline-workflow
description: >
  Bridges the ticket-driven git workflow to Plane — branch naming tied to a
  ticket ID, PR-to-ticket linkage, and Plane status/proof updates at pickup
  and merge. Composes with Superpowers' git-worktree/branch-finishing/code-
  review skills rather than duplicating them.
when_to_use: >
  Starting work on a Plane ticket; opening a PR; finishing/merging a branch.
allowed-tools: Read, Bash(git *), mcp__plane__retrieve_work_item, mcp__plane__update_work_item, mcp__plane__create_work_item_comment, mcp__plane__list_states, mcp__plane__list_work_items
---

# Wayline workflow (Plane bridge)

This skill is a **thin adapter** — it must never contain its own TDD loop, its own branch-cleanup logic, or its own review-request logic. It only adds Plane-awareness at exactly three seams: ticket-pickup → branch creation; PR-open → ticket linkage; PR-merge → ticket close + proof. Everything else is Superpowers' job (or, if Superpowers isn't invoked in a given session, apply the same discipline directly: plan before coding, TDD, self-review before opening a PR).

Plane MCP tools confirmed live against the Wayline workspace (project id `c7cda4d3-5901-4b60-ad05-fa108adf6384`, identifier `WAYLI`): `list_work_items`/`retrieve_work_item` to look up a ticket, `update_work_item` (pass the target `state` id from `list_states`) to move it between states, `create_work_item_comment` to attach proof, `list_work_item_links`/`create_work_item_link` to link the merged PR URL.

## Branch naming convention

`<type>/WAYLI-123-short-slug`, e.g. `feat/WAYLI-123-redaction-panel`, `fix/WAYLI-456-signed-url-ttl`. `<type>` reuses the same enum as the commit-message type (`feat`, `fix`, `refactor`, `perf`, `chore`, ...) — one vocabulary for both branch prefix and commit type, not two that can drift apart. Confirmed against the live Plane project: identifier is `WAYLI`.

## Workflow steps

1. Look up the ticket in Plane; confirm it's in a startable status (`Todo`); read its description and acceptance criteria.
2. Move the ticket to `In Progress` in Plane.
3. Create a branch off latest `main` using the naming convention above. If isolation is warranted (parallel work, risky experiment), delegate to Superpowers' `using-git-worktrees` rather than reimplementing worktree creation here.
4. Hand off ticket context (ID, title, acceptance criteria) to the implementation loop — Superpowers' `brainstorming` (if ambiguous) → `writing-plans` → `test-driven-development` (RED-GREEN-REFACTOR) → `executing-plans`/`subagent-driven-development` if those skills are in play this session; otherwise apply the same discipline directly. This skill supplies input and waits for that loop to report done — it does not reimplement it.
5. Before opening a PR: run verification (`/verify` or `/check`, and Superpowers' `verification-before-completion` if available) — lint, typecheck, full test suite with coverage.
6. Move the ticket to `In Review` in Plane. Open the PR: title includes the ticket ID; body follows `.github/PULL_REQUEST_TEMPLATE.md`. Hand the review-request step to Superpowers' `requesting-code-review` if available — don't duplicate its logic here.
7. Once review is addressed and CI/coverage is green, move the ticket to `Testing` — this is the verification/QA gate before merge, not a rubber stamp: confirm the acceptance criteria in the ticket are actually satisfied, not just that tests pass.
8. After merge: Superpowers' `finishing-a-development-branch` handles branch/worktree cleanup, if available; otherwise delete the merged branch normally. This skill's **only** addition on top: move the Plane ticket to `Done`, attach proof, and link the merged PR URL.

## Proof-attachment content (posted to the Plane ticket at merge)

- Tail of the `vitest run --coverage` output (coverage summary).
- Link or screenshot from the relevant Playwright HTML report, for UI-affecting changes.
- CI run URL.
- One-line human-readable summary of what changed and why — not just "done."

## Composition principle

This skill only touches Plane. It never reimplements TDD, branch cleanup, or code-review logic that Superpowers (or plain good practice) already covers — if you find yourself writing that logic inside this skill, stop and delegate instead.

- Exact Plane MCP tool names for "update issue status," "add comment," and "attach file/link" — verify live before relying on them.
