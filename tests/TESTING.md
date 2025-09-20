# Test conventions

This project uses Vitest browser mode with Playwright (Chromium) and `vitest-browser-vue` for mounting Vue components.

- Global setup is in `tests/setup.ts`:
  - Mocks `echarts/core` via `tests/helpers/mock.ts`
  - Centralizes DOM cleanup with `vitest-browser-vue/pure`'s `cleanup()` and resets `document.body` after each test

- Prefer helpers to reduce duplication:
  - `tests/helpers/renderChart.ts` exposes `renderChart(propsFactory, exposesRef)` to mount `src/ECharts` with reactive props and capture the exposed API.
  - `tests/helpers/dom.ts` provides `createSizedContainer`, `flushAnimationFrame`, and `withConsoleWarn`.
  - `tests/helpers/testing.ts` re-exports `render` from `vitest-browser-vue/pure` for consistency.

- Avoid testing internal, non-user-observable branches. Focus tests on public behavior of composables and the `ECharts` component, not implementation details.

- Keep tests deterministic: silence console warnings via `withConsoleWarn`; use `await nextTick()` to flush Vue updates; for ResizeObserver-driven code, use `flushAnimationFrame()`.
