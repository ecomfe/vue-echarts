# Testing

We run Vitest in two projects:

- **browser** (Playwright + `vitest-browser-vue`) for DOM/custom element coverage.
- **node** for pure logic tests.

- Global setup:
  - Browser: `tests/setup.browser.ts` (resets DOM after each test).
  - Node: `tests/setup.node.ts`.
- Prefer shared helpers under `tests/helpers/` to avoid duplicated setup.
- Test only public behavior; avoid internal implementation details.
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
- Run a single project:
  - Browser only: `pnpm test:browser`
  - Node only: `pnpm test:node`

## CI

- CI installs Chromium with `pnpm run test:setup` and runs `pnpm run test:coverage`.
- Coverage is uploaded from `coverage/lcov.info` to Codecov for pull requests and `main`.
