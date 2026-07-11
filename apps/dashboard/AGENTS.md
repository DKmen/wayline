# apps/dashboard — Agent Instructions

Vite + React + TypeScript SPA. TanStack Query + Router, shadcn/ui, Tailwind v4. Read alongside the root `AGENTS.md` (comment policy, one-thing-per-file, testing discipline, workflow all apply here too — this file adds the frontend-specific detail on top).

## Component conventions

- One component per file, filename PascalCase matching the export name. `react/no-multi-comp` enforces this mechanically (`ignoreStateless: true` — multiple tiny stateless helpers in one file are fine, stateful components are not).
- Function-declaration components, not `React.FC`. Props typed as `interface ComponentNameProps { ... }`, destructured in the signature.
- Exported component gets the one-line purpose doc-comment (root policy) — not per-prop JSDoc unless a prop's meaning is genuinely non-obvious (a bitmask, a callback with non-standard semantics).
- File placement: `components/<Domain>/<ComponentName>.tsx`; hooks `hooks/use-thing.ts`; routes under the router's file-based `routes/` convention.

## Design tokens (see `docs/05-design-system.md`)

Never hardcode hex colors in component files — consume Tailwind v4 `@theme` OKLCH tokens from `packages/ui` (`--ink`, `--way-blue`, `--mist`, `--amber`, success/danger). Instrument Sans is the default typeface; JetBrains Mono is reserved for URLs/selectors in the editor inspector.

## shadcn/ui vs. custom components

shadcn primitives (Button, Input, Dialog, DropdownMenu, Tooltip, Tabs, Badge, Table, Toast, Avatar, Skeleton, Command) come from shadcn — don't hand-roll them. The product's identity lives in its custom components (`FlowCard`, `Filmstrip`, `StepCanvas`, `RedactionPanel`, `RecordingPill`, `SpotlightOverlay`, `WalkthroughBar`, `PauseCard`, `VideoPlayer`, `OnboardingChecklist`, `PlanUsageMeter`) — build these in `packages/ui`'s Storybook first and screenshot-review against the design PDF before wiring into a screen.

## TanStack Query vs. local state — decision rule

- Server-derived data → `useQuery`, query keys namespaced `[workspaceId, resource, ...params]`.
- Mutations → `useMutation` + explicit `invalidateQueries` (no manual cache poking unless perf-justified).
- Ephemeral UI-only state (dialog open/closed, hover, in-progress form draft) → `useState`/`useReducer`, never Query.
- Cross-component-but-page-local state (e.g. the editor's active step index) → prefer TanStack Router **search params** (shareable, back/forward-friendly) over ad hoc context/store; only reach for context/store if URL-encoding is genuinely awkward.

## Accessibility (non-negotiable)

- Keyboard: editor ⌘Z/⇧⌘Z, arrow keys between steps, Del; player space/←/→ seek.
- Any state conveyed by color (status chips, warnings) needs a non-color signifier too (icon or text).
- Every dashboard flow must be completable keyboard-only — wire real `<button>`/`onKeyDown` semantics, never a click-only `div`.
- Tooltip/overlay text legible at 200% zoom.

## Comment calibration example

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
