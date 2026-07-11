## Ticket

<!-- Link the Plane ticket, e.g. WAYLI-123 -->

## Summary

<!-- What changed and why, in a sentence or two. Not "various fixes." -->

## Test plan

- [ ] Unit tests added/updated for the change
- [ ] Both a positive case and a negative/edge case are covered (see `wayline-testing` skill / `docs/09-security-privacy.md §5` for the concrete negative-test list if this touches auth, redaction, or entitlements)
- [ ] Coverage stays ≥95% (lines/branches/functions/statements) — `pnpm test:coverage`
- [ ] e2e/Playwright updated, if this touches capture, walkthrough, or a user-facing flow
- [ ] Screenshots attached, if this changes UI

## Security review

- [ ] This PR touches auth, upload, signing, or permission logic → ran `/security-review` and addressed findings
- [ ] N/A — no security-sensitive surface touched
