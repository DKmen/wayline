# apps/fixture

Test-target web app (SPA nav, shadow DOM, iframe, target-change, ambiguous-target cases) used by extension capture/walkthrough tests. Dev/test only, never deployed. Vanilla TS + Vite, no framework — keeps DOM mutations for the target-change case unambiguous ground truth. Built in WAYLI-25 (Sprint 0), ahead of the roadmap's original Sprint 2 slot, since it was the last blocker before Sprint 1. See [docs/08-local-dev.md §2](/Users/dhrimilmendapara/Documents/flow-recorder/docs/08-local-dev.md) and [docs/06-extension-spec.md §8](/Users/dhrimilmendapara/Documents/flow-recorder/docs/06-extension-spec.md).

Playwright harness (`e2e/`) proves the fixture's own pages are deterministic — navigation, shadow-DOM piercing, iframe reachability, the target-change swap, and the ambiguous-target tie. The full extension-loaded integration suite (`chromium.launchPersistentContext` with the built extension, docs/06 §8) is Sprint 2's job, once `apps/extension` has real source.
