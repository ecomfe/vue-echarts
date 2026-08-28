# RFC: `src` Simplification and Reactive Attr Events

- Status: Implemented
- Released in: v8.2.0
- Scope: `/src` runtime internals and docs

## Goals

1. Improve maintainability by reducing `src/ECharts.ts` responsibilities.
2. Preserve the public API while refactoring internals.
3. Make attrs-based event bindings reactive by default.
4. Preserve smart-update semantics while improving implementation clarity.

## Non-goals

1. Introducing breaking API changes.
2. Adding new runtime dependencies.
3. Changing build output structure.

## Decisions

1. Keep attrs event reactivity in `src/core/events.ts` and structural update planning in `src/update.ts`.
2. Keep lifecycle and option-application orchestration explicit in `ECharts.ts`.
3. Do not add a `reactive-events` switch.
4. Do not add a `VChartExposed` export.
5. Prefer straightforward implementation over speculative abstraction.
6. Internal module APIs are not compatibility-bound and can be refactored with callsites together.
7. Own Vue-side cleanup and scheduling, but do not retry or roll back failed ECharts operations.
8. Plan updates for type-valid ECharts options, not cyclic data or null/primitive component entries rejected by the public types.

## Runtime Structure

- `src/core/events.ts`
  - Reactive chart/zr listener binding with diff + cleanup.
  - Reactive native listener projection for render attrs.
- `src/update.ts`
  - Direct smart-update planning for type-valid ECharts options, independent of Vue lifecycle state.
- `src/ECharts.ts`
  - Chart init/cleanup, reactive source coordination, and option-plan application.

## Runtime Principles

Runtime code follows these boundaries:

- The component owns one current chart and its lifecycle, theme, loading, resize, and option flow.
  It cancels Vue-owned work on disposal but does not retry or roll back failed ECharts operations.
- Smart updates inspect valid option shapes directly. They remove stale component state where
  required, while leaving ordinary updates to ECharts so interactive state is preserved.
- Callback slots patch the current option directly. They may create missing object containers, but
  never synthesize component arrays, data arrays, or entries absent from the source option.
- Chart, ZRender, and native listeners use direct diff and rebinding. A `once` listener detaches
  before invoking user code.
- Graphic keeps only state required for stable identity, render order, batching, handler reuse,
  document ownership, and SSR. Each enabled runtime owns one collector.
- Autoresize applies the configured throttle to every observation through one eligibility check;
  loading visibility and options share one deep watcher.
- Shared helpers must remove real repetition. Small scans and allocations are preferred to caches,
  indexes, revision counters, recovery modes, or optional internal modes without measured value.
- Tests prefer public component behavior. Internal units remain only for contracts that cannot be
  observed reliably at the public boundary, and they cover valid inputs rather than malformed or
  cyclic states excluded by the public types.

Styles retain the original base rules and import-time document injection. Runtime code does not
maintain a second registry for ShadowRoot, cross-document restoration, or failed stylesheet
adoption. Public documentation directs those scopes to the explicit stylesheet entry instead.

## Convergence Boundary

The remaining runtime state corresponds to observable contracts: chart lifecycle and theme replay,
callback-slot containers, listener ownership, smart option removal, Graphic identity and ordering,
and throttled resize cleanup. Do not add more fast paths or recovery state for these paths without a
measured bottleneck or a reproducible public failure; the small allocations and scans that remain are
preferred to additional branches, caches, or revision bookkeeping.

## Behavior

Attrs listeners now update reactively:

- `on<Event>`
- `onZr:<event>`
- `onNative:<event>`

Template syntax and runtime method signatures remain unchanged.

## Risks and Controls

1. Listener leaks when attrs update frequently.
   - Control: per-key binding table and full unmount cleanup.
2. `once` listeners losing stable identity.
   - Control: store wrapped callback and unbind old callback before rebinding.
3. Regression in option update behavior.
   - Control: planner unit tests plus observable component and real-ECharts integration tests.

## Validation

Required checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:node`
- `pnpm test:browser`

Behavior contracts:

- attrs chart handler switch A -> B
- attrs zr handler switch A -> B
- attrs native handler switch A -> B
- once handler replacement remains one-shot
- item and nested-property removals do not leave stale option state
- ordinary updates preserve interactive ECharts state
