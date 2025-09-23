# Testing

We run Vitest in browser mode using Playwright (Chromium) with `vitest-browser-vue` to mount Vue components.

- Global setup: see `tests/setup.ts` (mocks `echarts/core`, resets DOM after each test).
- Prefer shared helpers under `tests/helpers/` to avoid duplicated setup.
- Test only public behavior; avoid internal implementation details.
- Keep tests deterministic: silence console noise and flush updates/animation frames with provided helpers.

## Run locally

- Install dependencies: `pnpm install`
- Install Chromium: `pnpm exec playwright install chromium`
- Run tests: `pnpm test`
- Coverage (V8): `pnpm test:coverage`
  - HTML report: `coverage/browser/index.html`
  - LCOV: `coverage/browser/lcov.info`

## CI

- CI runs tests with coverage and uploads LCOV to Codecov (non-blocking).
- Chromium is provisioned via the Playwright GitHub Action.
- Optional: restrict Codecov uploads to PRs and `main` via a workflow condition.
