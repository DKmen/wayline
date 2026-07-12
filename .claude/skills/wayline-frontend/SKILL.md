---
name: wayline-frontend
description: >
  Wayline dashboard & landing frontend conventions — React components, TanStack
  Query/Router, shadcn/ui, Tailwind v4 design tokens, accessibility. Use when
  creating or editing components, routes, hooks, or styles under the dashboard
  or landing apps, or the shared UI package.
when_to_use: >
  Creating/editing a React component or route; adding a TanStack Query hook;
  touching Tailwind/shadcn styling; reviewing for accessibility.
paths:
  - apps/dashboard/**
  - apps/landing/**
  - packages/ui/**
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(pnpm *)
---

# Wayline frontend conventions

## Component-per-file

One component per file, filename = PascalCase = export name. Enforced by `react/no-multi-comp` (`ignoreStateless: true`) where it applies; convention + review everywhere else. Co-locate the test file (`ComponentName.test.tsx`) next to the component — see `wayline-testing` for the full file-placement rule, don't duplicate it here.

## Props & comments

Function-declaration components, not `React.FC`. `interface ComponentNameProps { ... }`, destructured in the signature. Exported components get a one-line purpose doc-comment (see root `CLAUDE.md` comment policy) — not per-prop JSDoc unless a prop's meaning is genuinely non-obvious (a bitmask, a callback with non-standard semantics).

## Design tokens (docs/05-design-system.md §1)

Never hardcode hex/colors in component files — consume Tailwind v4 `@theme` OKLCH tokens from `packages/ui`: `--ink` (#17222F), `--way-blue` (#2A6FDB), `--mist` (#F6F7F9), `--amber` (#B9750B), plus success/danger. Instrument Sans is the default typeface; JetBrains Mono is reserved for URLs/selectors in the editor inspector.

## shadcn/ui vs. custom identity components (docs/05 §2)

shadcn primitives (Button, Input, Dialog, DropdownMenu, Tooltip, Tabs, Badge, Table, Toast, Avatar, Skeleton, Command) come from shadcn — don't hand-roll them. **Only Button, Input, Badge, and Tooltip exist yet** (WAYLI-24, Radix backend, `radix-nova` style) — the rest are added per-screen starting Sprint 1, the same build-as-needed way the custom components below are. The product's visual identity lives in its custom components: `FlowCard`, `Filmstrip`, `StepCanvas`, `RedactionPanel`, `RecordingPill`, `SpotlightOverlay`, `WalkthroughBar`, `PauseCard`, `VideoPlayer`, `OnboardingChecklist`, `PlanUsageMeter`. Build these in `packages/ui`'s Storybook first and screenshot-review against the design PDF (`docs/App workflow and design specification.pdf`) before wiring into a screen (docs/05 §5).

## TanStack Query vs. local state — decision rule

- Server-derived data → `useQuery`, query keys namespaced `[workspaceId, resource, ...params]`.
- Mutations → `useMutation` + explicit `invalidateQueries` (no manual cache poking unless perf-justified).
- Ephemeral UI-only state (dialog open/closed, hover, in-progress form draft) → `useState`/`useReducer`, never Query.
- Cross-component-but-page-local state (e.g. the editor's active step index) → prefer TanStack Router **search params** (shareable, back/forward-friendly) over ad hoc context/store; only reach for context/store if URL-encoding is genuinely awkward.

## TanStack Router conventions

File-based routes, loaders for prefetch tied to Query, Zod-validated search params, route-level error boundaries.

## Accessibility (non-negotiable, docs/05 §4)

- Keyboard: editor ⌘Z/⇧⌘Z, arrow keys between steps, Del; player space/←/→ seek.
- ARIA labels on any overlay/side-panel-derived dashboard equivalents.
- Any state conveyed by color (status chips, warnings) needs a non-color signifier too (icon or text) — mirrors the extension's "spotlight never lies, always has an outline+tooltip" rule.
- Every dashboard flow completable keyboard-only — real `<button>`/`onKeyDown` semantics, never a click-only `div`.
- Tooltip/overlay text legible at 200% zoom.

## Comment calibration example (illustrative, not literal final prose)

```tsx
/** Renders one step's redaction findings and lets the creator resolve each. */
export function RedactionPanel({ findings, onResolve }: RedactionPanelProps) {
  // Sorted so unresolved warnings surface above already-redacted ones —
  // creators triage top-down and shouldn't have to hunt.
  const sorted = useMemo(() => sortByStatus(findings), [findings]);

  return (
    <ul>
      {sorted.map((finding) => (
        <FindingCard key={finding.id} finding={finding} onResolve={onResolve} />
      ))}
    </ul>
  );
}
```

No comment on the `.map` — obvious. No per-prop JSDoc — the types are self-explanatory.

## File placement

`components/<Domain>/<ComponentName>.tsx`; hooks `hooks/use-thing.ts`; routes under the router's file-based `routes/` convention.
