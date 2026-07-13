# Claude–Codex Local Context Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically import a safe, compact handoff from Claude into Codex and from Codex into Claude for Wayline.

**Architecture:** A dependency-free Node JSONL bridge powers project-scoped lifecycle hooks and manual skills. It filters unsafe records, redacts likely credentials, bounds output, and fails open.

**Tech Stack:** Node.js ESM, Vitest, Claude Code hooks, Codex hooks.

## Tasks

- [x] Create WAYLI-91, move it to In Progress, branch from current `main`, and verify the test baseline.
- [x] Add failing fixture tests for transcript parsing, repository discovery, redaction, rendering, lifecycle deduplication, and hook output.
- [x] Implement the tested bridge and CLI until focused tests pass.
- [x] Configure both startup hooks and native manual skills.
- [x] Run lint, typecheck, full coverage, build, smoke tests, and complete review/PR handoff.
