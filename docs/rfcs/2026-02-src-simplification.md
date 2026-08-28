# RFC: `src` Simplification and Reactive Attr Events

- Status: Implemented
- Released in: v8.1.0
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
  - Structural option summaries and smart-update planning, independent of Vue lifecycle state.
- `src/ECharts.ts`
  - Chart init/cleanup, reactive source coordination, and option-plan application.

## Implementation Principle

For callback slots and internal runtime logic, prioritize direct and explicit code paths:

- avoid descriptor/compiler-style layers unless they reduce concrete complexity;
- treat listener arrays as type-valid function arrays while still supporting empty/non-empty mutations;
- keep parsing and application logic close to where it is used;
- use named shared helpers only when they remove repetition without adding indirection;
- clear removed callback-slot functions in the option instead of maintaining a separate merge plan;
- treat each callback-slot patch as current state, with no separate post-update commit phase;
- rebind changed event sources directly instead of routing listeners through mutable invoker boxes;
- implement chart and ZRender `once` listeners by detaching before user code, without a second
  wrapper-local consumed state;
- keep ordered component shapes as direct arrays and compare their identities without parallel indexes;
- keep per-element Graphic restrictions in the public types and option builder, not duplicated runtime prop tables;
- give unkeyed Graphic nodes a stable component-local identity without guessing whether they
  came from an unkeyed `v-for`;
- let each enabled Graphic runtime own one collector directly instead of maintaining an optional
  mode solely to avoid a few empty collections;
- require internal helpers to carry context every caller owns—Graphic collector owner/warning
  identity and the next callback-slot path segment—instead of optional internal call modes;
- trust a present custom-elements registry's standard contract and arbitrate constructor
  compatibility before synchronous registration;
- model lifecycle around the component scope and single current chart; cancel owned queued work on scope disposal instead of giving subordinate runtimes or collectors their own disposed modes;
- let the configured throttle govern every observed resize, including recovery from zero size,
  without a separate recovery mode;
- drive loading visibility and options through one watcher, without caching equivalent inputs or
  guarding custom effects that mutate their reactive inputs.
- let Node entry tests import the Graphic runtime without provisioning browser constructors that
  production code does not read.
- verify Graphic SSR through the public component and hydration flow, without a parallel internal
  mount probe that asserts collector call counts.
- verify Graphic ordering through public slot and component behavior, without a parallel VNode
  traversal suite that fixes internal map and scan details.
- test Graphic batching and duplicate-id warnings at the public slot boundary; keep collector units
  for ownership, render-pass, and pending-work contracts unique to the collector.
- test the Graphic entry's automatic registration directly, while exercising extension rendering,
  warnings, and inactive paths through the public component.
- test ordinary, native, and ZRender listener behavior through the public component; keep core
  event units only for mutable arrays and listener state across chart replacement.
- keep injection keys owned by one module instance instead of coupling duplicate package instances
  through the global symbol registry.
- test custom-element registration through registry collisions and observable disconnect behavior,
  without fixing internal early-return or repeated same-module call details.
- keep one planner test per distinct structural decision, preferring observable ECharts state over
  duplicate plan-only scenarios and excluding malformed option shapes.
- keep watch-change comparison in one helper and analyze local plain objects without a parallel
  shallow-equality API or cross-realm prototype heuristic.
- test loading lifecycle through the public component, including injected option merging, instead
  of maintaining a parallel composable watcher suite.
- let callback slots create missing object containers, but never synthesize component/data arrays
  or their entries when the source option does not define them.
- record option state before invoking ECharts so public `clear()` resets that same state directly;
  do not maintain revision counters for nested ECharts callbacks.
- test `clear()` and theme changes as sequential public interactions instead of synthesizing
  `clear()` or `dispose()` from mocked `setOption()` and `setTheme()` calls.
- after ECharts calls, only verify that the chart remains current; do not retain option-identity
  guards solely for synchronous re-entry from mocked ECharts callbacks.
- end initial autoresize deferral immediately after the first resize and let normal Vue watchers
  process later prop changes, without a second microtask retry path.
- route every observed size through one resize eligibility check; test enabled behavior and cleanup
  without fixing internal observer rebind counts.
- replace changed Graphic collector records directly while preserving their handler cache; do not
  mutate records in place or prefilter occupied IDs merely to save small temporary allocations.
- let collector cancellation reset its render pass directly; do not branch solely to avoid clearing
  a small pass-local Map when no flush is pending.
- warn about a missing Graphic extension when the slot is declared at setup; do not maintain an
  updated-hook state machine solely to detect a dynamically added unsupported slot.
- warn about invalid callback slot names declared at setup; do not retain a `Set` solely to detect
  and deduplicate dynamically added invalid names.
- test callback-slot reset behavior at the composable boundary; do not synthesize terminal chart
  disposal inside mocked option commits and invoke formatters retained from the disposed chart.
- use callback-slot readiness to reset payloads and rebuild containers across chart replacement;
  do not guard formatters retained from an inactive chart.
- keep callback-slot readiness inside its composable and expose a direct lifecycle method instead
  of passing a Ref across modules and watching it with another reactive effect.
- group Graphic public-prop type assertions by semantic contract instead of repeating one alias per
  field; retain exact, accepted-input, and rejected-key coverage.

Styles retain the original base rules and import-time document injection. Runtime code does not
maintain a second registry for ShadowRoot, cross-document restoration, or failed stylesheet
adoption. Public documentation directs those scopes to the explicit stylesheet entry instead.

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
