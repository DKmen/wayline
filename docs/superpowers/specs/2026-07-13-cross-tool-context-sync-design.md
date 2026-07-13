# Claude–Codex Local Context Bridge Design

## Goal

Give Wayline's Claude Code and Codex sessions a compact, automatic handoff from the other local coding tool before work begins.

## Design

Project `SessionStart` hooks call one dependency-free Node bridge for startup, resume, clear, and compact events. The target selects the opposite tool's newest transcript associated with the repository, extracts six completed user/assistant turns, masks likely credentials, adds live Git state, and emits no more than 8,000 characters through `additionalContext`.

Imported content is reference-only. System/developer content, reasoning, tools, attachments, metadata, sidechains, incomplete responses, and hook payloads are excluded. A per-target fingerprint under `.git` avoids unchanged resume duplication. Discovery and parsing fail open because transcript formats are local implementation details rather than stable APIs.

## Interfaces

- Automatic: checked-in Claude and Codex `SessionStart` hooks.
- Manual: `/sync-context`, `$sync-context`, or `pnpm context:sync --for claude|codex`.
- Runtime state: `.git/agent-context-sync/`; no transcript content is committed.
