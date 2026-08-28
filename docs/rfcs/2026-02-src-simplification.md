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
