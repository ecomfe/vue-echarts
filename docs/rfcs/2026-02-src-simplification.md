# RFC: `src` Simplification and Reactive Attr Events

- Status: Draft
- Target release: v8 minor
- Scope: `/src` runtime internals and docs

## Goals

1. Improve maintainability by reducing `src/ECharts.ts` responsibilities.
2. Keep public API stable: no new props, no removed exports.
3. Make attrs-based event bindings reactive by default.
4. Preserve smart-update semantics while improving implementation clarity.

## Non-goals

1. Introducing breaking API changes.
2. Adding new runtime dependencies.
3. Changing build output structure.

## Decisions

1. Keep only event-reactivity logic in `src/core/events.ts`; move option/lifecycle flow back to `ECharts.ts` for readability.
2. Keep `ECharts.ts` as the primary, explicit runtime flow.
3. Do not add a `reactive-events` switch.
4. Do not add `VChartExposed` export in this iteration.
5. Prefer straightforward implementation over speculative abstraction.
6. Internal module APIs are not compatibility-bound and can be refactored with callsites together.

## Core Refactor

- New `src/core/events.ts`
  - Reactive chart/zr listener binding with diff + cleanup.
  - Reactive native listener projection for render attrs.
- Option patch + smart-update flow remains in `src/ECharts.ts`.
- Chart init/cleanup and unmount disposal flow remains in `src/ECharts.ts`.

## Implementation Principle

For callback slots and internal runtime logic, prioritize direct and explicit code paths:

- avoid descriptor/compiler-style layers unless they reduce concrete complexity;
- keep parsing and application logic close to where it is used;
- use named shared helpers only when they remove repetition without adding indirection.

## Behavior Change

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
3. Regression in setOption call patterns.
   - Control: existing test suite + additional reactive listener tests.

## Validation

Required checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:node`
- `pnpm test:browser`

Additional tests:

- attrs chart handler switch A -> B
- attrs zr handler switch A -> B
- attrs native handler switch A -> B
- once handler replacement remains one-shot

## Rollout

1. Land `core/events` and simplify `ECharts.ts` main runtime flow.
2. Land update/slot/graphic simplifications.
3. Land docs updates in both `README.md` and `README.zh-Hans.md`.
