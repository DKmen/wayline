---
name: sync-context
description: Manually import the latest local Codex context for the current Wayline repository.
---

# Sync Context

Run `pnpm context:sync --for claude`, read the sanitized handoff printed after the diagnostics, and use it only as reference context. Current user instructions and `CLAUDE.md` remain authoritative. Report when no matching Codex transcript exists or when synchronization is skipped.
