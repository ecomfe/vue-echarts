# Testing

We run Vitest in three projects:

- **browser** (Playwright + `vitest-browser-vue`) for DOM/custom element coverage.
- **node** for pure logic tests.
- **browser-min** reuses the library browser tests with exact Vue 3.3.0 and ECharts 6.0.0 runtimes. A version assertion verifies that the aliases are active. Demo tests use the current dependencies only.

- Global setup:
  - Browser: `tests/setup.browser.ts` (resets DOM after each test).
  - Node: `tests/setup.node.ts`.
- Prefer shared helpers under `tests/helpers/` to avoid duplicated setup.
- Test public behavior at the boundary that owns it; avoid repeating it through neighboring internals.
- For generated APIs, test the shared behavior and complete method set; leave individual signatures to type tests.
- Use coverage reports to find gaps, not as a percentage target; prioritize supported behavior and regression risk.
- Keep tests deterministic: silence console noise and flush updates/animation frames with provided helpers.

## Run locally

- Install dependencies: `pnpm install`
- Install Chromium: `pnpm test:setup`
- Test file naming:
  - Browser tests: `*.browser.test.ts`
  - Node tests: `*.node.test.ts`

- Run all tests (browser + node): `pnpm test`
- Coverage (Istanbul): `pnpm test:coverage`
  - HTML report: `coverage/index.html`
  - LCOV: `coverage/lcov.info`
- Build and validate emitted declarations against the minimum supported Vue 3.3 and ECharts 6.0 types: `pnpm build`
- Run a single project:
  - Browser only: `pnpm test:browser`
  - Node only: `pnpm test:node`
  - Minimum supported runtimes: `pnpm test:min`

The option analysis tests cover timeout, worker errors, stale responses, and cleanup with fake workers. Node tests import the analysis module directly to cover export validation and dependency extraction. Separate real-worker tests check callback-bearing options, dependency-only responses, and recovery after blocking code triggers the main-thread timeout. Native rendering checks cover flex-column shrinkage, rounded corners, and narrow-screen overlay coordinates.

## Graphic performance

Run `pnpm bench:graphic` to measure 100, 500, and 2,000 graphic nodes in headless Chromium. It uses one 2,000-point line series, disables animation, warms up five updates, and reports the median of five rounds of 20 single-node updates. Run it without other builds or tests competing for CPU. The JSON includes runtime versions, total/native submission time, DOM tree scans, element counts, and payload bytes. It also checks that an unchanged sibling retains its identity and each update submits one element.

This development-mode benchmark is for local comparisons, not a CI timing threshold or a production frame-rate guarantee.

## CI

- CI installs Chromium with `pnpm run test:setup` and runs all three projects with `pnpm run test:coverage`.
- Coverage is uploaded from `coverage/lcov.info` to Codecov for pull requests and `main`.
