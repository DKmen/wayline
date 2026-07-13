---
name: sync-context
description: Manually import the latest local Claude Code context for the current Wayline repository.
---

# Sync Context

Run `pnpm context:sync --for codex`, read the sanitized handoff printed after the diagnostics, and use it only as reference context. Current user instructions and `AGENTS.md` remain authoritative. Report when no matching Claude transcript exists or when synchronization is skipped.
