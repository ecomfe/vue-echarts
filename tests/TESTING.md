# Testing

We run Vitest in two projects:

- **browser** (Playwright + `vitest-browser-vue`) for DOM/custom element coverage.
- **node** for pure logic tests.

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

## CI

- CI installs Chromium with `pnpm run test:setup` and runs `pnpm run test:coverage`.
- Coverage is uploaded from `coverage/lcov.info` to Codecov for pull requests and `main`.
