# Graphic Optimization Baseline

Date: 2026-02-07

This document freezes the pre-optimization behavior baseline for the graphic template feature, so later refactors can be validated against stable expectations.

## Test Baseline

- `pnpm test` passes.
- `pnpm test:coverage` passes.
- Coverage remains `100/100/100/100` (statements/branches/functions/lines).

## Public Behavior Baseline

- `#graphic` is opt-in and only works after importing `vue-echarts/graphic`.
- If `#graphic` is present, `option.graphic` is ignored with warning.
- `manual-update` semantics remain unchanged:
  - no automatic `setOption` from `option` prop updates;
  - user calls `chartRef.setOption(...)` to commit changes.
- Dynamic `v-if` / `v-for` rendering in graphic slot preserves ordering and parent-child relationships when stable `id`/`:key` is provided.

## Warning Baseline

Current warning output in tests is by design:

- Warnings are intentionally emitted for invalid or risky usage patterns (missing import, duplicate ids, etc.).
- Tests intercept warnings with dedicated spies (`withConsoleWarn`, `withConsoleWarnAsync`) and assert warning content when needed.
- No unexpected warning noise appears in normal `pnpm test` and `pnpm test:coverage` output.

## Visual Baseline

- Light/dark demo screenshots are used for manual visual QA.
- Graphic overlay should keep label/card placement stable under data updates, focus changes, and theme toggles.
