# Wayline — Documentation Set

_Every workflow, one line to follow._ Private-by-default browser workflow capture: one recording → a polished silent guided video + a live in-Chrome follow-along walkthrough.

Read in order for the full picture; each doc stands alone for reference.

| #   | Doc                                              | One-liner                                                                          |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 00  | [Product brief](./00-product-brief.md)           | Vision, positioning, personas, freemium pricing, success criteria                  |
| 01  | [Market research](./01-market-research.md)       | Competitor profiles & matrix (July 2026), gaps, patterns to copy                   |
| 02  | [Product spec](./02-product-spec.md)             | Journeys: onboarding, capture, editor, publish, video, walkthrough, teams, gating  |
| 03  | [Architecture](./03-architecture.md)             | Stack (TS end-to-end), system diagram, extension auth, publish & render pipelines  |
| 04  | [Data model](./04-data-model.md)                 | Postgres schema, entitlements, analytics tables, local draft store                 |
| 05  | [Design system](./05-design-system.md)           | Wayline brand tokens, component & screen inventory (maps to the design PDF)        |
| 06  | [Extension spec](./06-extension-spec.md)         | MV3/WXT architecture, capture engine, target descriptors, walkthrough, CWS release |
| 07  | [AWS infrastructure](./07-aws-infrastructure.md) | Reference architecture, OpenTofu, CI/CD, observability, cost model                 |
| 08  | [Local dev](./08-local-dev.md)                   | Monorepo layout, docker-compose parity stack (no LocalStack — decision inside)     |
| 09  | [Security & privacy](./09-security-privacy.md)   | The four guarantees, controls, retention, CWS compliance                           |
| 10  | [Analytics spec](./10-analytics-spec.md)         | Event taxonomy, rollups, compliance-framed dashboards                              |
| 11  | [Roadmap & sprints](./11-roadmap-sprints.md)     | 12 sprints / 5 milestones to production launch                                     |

**Design reference**: `App workflow and design specification.pdf` — approved hi-fi mockups (screens 2a–2g), canonical for visual direction.

**History**: [flow-recorder-v1.md](./flow-recorder-v1.md) is the original spec, superseded by 00–11 (core loop carried forward; landing/analytics/teams/billing added; stack and infra decided).
