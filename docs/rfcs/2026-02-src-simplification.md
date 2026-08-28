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
- keep parsing and application logic close to where it is used;
- use named shared helpers only when they remove repetition without adding indirection;
- clear removed callback-slot functions in the option instead of maintaining a separate merge plan;
- treat each callback-slot patch as current state, with no separate post-update commit phase;
- rebind changed event sources directly instead of routing listeners through mutable invoker boxes;
- keep ordered component shapes as direct arrays and compare their identities without parallel indexes;
- keep per-element Graphic restrictions in the public types and option builder, not duplicated runtime prop tables;
- model lifecycle around the component scope and single current chart; cancel owned queued work on scope disposal instead of giving subordinate runtimes or collectors their own disposed modes;
- drive loading visibility and options through one watcher instead of parallel force-update paths.

Styles retain the original import-time document injection. Runtime code does not maintain a
second registry for ShadowRoot, cross-document restoration, or failed stylesheet adoption.

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
