## 8.2.0

### Component API and TypeScript

- Added typed, read-only `chart` and `root` properties. `chart` follows chart re-initialization and becomes unavailable when the component is disposed; `root` exposes the mounted `<x-vue-echarts>` element.
- Exposed more current ECharts instance methods: `getZr`, `getId`, `isSSR`, `getDevicePixelRatio`, `makeActionFromEvent`, `updateLabelLayout`, `convertToLayout`, `getVisual`, `renderToCanvas`, `renderToSVGString`, and `getSvgDataURL`.
- Made the component's public `dispose()` terminal and idempotent. Subsequent proxied method calls report that the component has been disposed instead of operating on stale component state.
- Exported `AutoResize` and `LoadingOptions` from the package root.
- Published the `#graphic` slot in the root component type while keeping its runtime opt-in through `vue-echarts/graphic`.
- Made generated component declarations work with the supported peer floors, Vue 3.3 and ECharts 6.0, and added package-level declaration checks for the graphic slot.
- Expanded event declarations and payload types for graph, geo, tree, Sankey, selection, highlight/downplay, tooltip actions, axis break, render completion, ZRender, native, and `.once` handlers.
- Added idiomatic camel-case event prop aliases such as `onDataZoom`, `onBrushEnd`, and `onZr:mouseMove`, while retaining the existing lower-case forms.
- Allowed reactive injected theme, init, update, and loading options to resolve to `null` or `undefined`; an explicit prop still takes precedence over its injected value.

### Loading

- Added the `loading-type` prop for selecting an ECharts loading effect registered by name.
- Allowed effect-specific fields in `loading-options` while retaining explicit types for the built-in loading effect.
- Merged injected and local loading options reactively, including nested mutations, and kept loading state synchronized when the chart instance or effect type changes.
- Applied the loading overlay as soon as a new chart instance becomes available, independently of the first option update.

### Events and callback slots

- Made chart and ZRender listeners reactive: replacing or removing an attrs listener now rebinds only that listener and detaches it from the previous chart or emitter.
- Made array listeners dispatch from a stable snapshot so handlers added or removed during an event affect the next dispatch rather than the current one.
- Made `.once` listeners detach before invoking user code and remain consumed until their source handler is replaced.
- Preserved exact, case-sensitive names for `native:` events and allowed Vue's normal DOM modifiers on them; ECharts and ZRender listeners continue to support only `.once`.
- Added documented and typed coverage for roam, node focus/drag, tree expansion, axis break, tooltip action, `updated`, and the complete supported ZRender pointer and drag event set.
- Let callback slots target indexed `tooltip` and `toolbox` components as well as nested `baseOption`, timeline `options`, `media`, axes, series, and data entries.
- Kept callback-slot path handling structural: missing object containers may be created, but missing component or data arrays and entries are not synthesized.
- Cleared injected callbacks when a slot is removed, refreshed slots when ECharts reuses the same formatter payload object, and delayed slot updates until their detached render containers are ready.
- Created detached slot containers in the component's owner document and rejected empty, mismatched array/object, and `__proto__` path segments.
- In `manual-update` mode, callback-slot additions and removals remain pending until the next manual `setOption` call.

### `vue-echarts/graphic`

- Added `GEllipse` with `cx`, `cy`, `rx`, and `ry` shape props.
- Added `auto-batch` for Canvas path batching and added missing path progress, crop, transform, stacking, clipping, tooltip, extra-state, and `during` props.
- Expanded path styling with gradient/pattern colors, decals, stroke percentage and opacity controls, scaled-stroke control, dash variants, and stroke ordering.
- Expanded text styling with font fields, rich text, backgrounds, padding, margins, borders, alignment, dimensions, overflow, ellipsis, placeholders, and truncation controls, including `textFont` compatibility.
- Added typed enter/update/leave/keyframe animation options, shape/style transition declarations, and the `during` callback.
- Narrowed each `G*` component to the props and slots its ECharts element type actually accepts; only `GGroup` exposes a default child slot.
- Added `dblclick`, `contextmenu`, and `.once` graphic handlers; returning `true` from a graphic handler stops bubbling.
- Preserved keyed and numeric-keyed element order, parent changes, handler identity, and duplicate-ID diagnostics while batching multiple Vue-side graphic changes into one update.
- Allowed graphic-only charts to omit the `option` prop. `#graphic` continues to replace `option.graphic`, with a warning when both sources are supplied.
- Removed the unusable `GCompoundPath` export because the ECharts graphic component rejects `compoundPath` elements at runtime.

### Smart update and option flow

- Reworked smart-update analysis around ECharts' registered component models instead of a fixed list of option keys, including custom registered components.
- Tracked component `id`/`name`, object-versus-array shape, anonymous position, nested property shape, `baseOption`, timeline options, media options, and graphic child collections.
- Used `replaceMerge` for component removal and reorder cases that it can reproduce safely, including anonymous component deletions.
- Used `notMerge: true` when nested properties are removed from identified components, component order cannot be reproduced by `replaceMerge`, non-component arrays shrink or appear, ARIA is enabled after initialization, or another structural change requires a rebuild.
- Preserved normal merge for ordinary value updates so ECharts interaction state is not reset unnecessarily.
- Kept graphic `$action` updates on the existing element tree. Structural changes that require a full rebuild should be submitted separately from a graphic action.
- Forwarded explicit `update-options` directly to ECharts without running the planner; the first later smart update rebuilds once to establish a new structural baseline.
- Reset planner state after `clear()` and prevented a later theme change from replaying an option that was intentionally cleared.
- Treated temporary removal of the `option` prop as a pause in automatic updates rather than a request to restore an older option.

### Theme, initialization, manual mode, and lifecycle

- Applied explicit props before injected defaults and allowed an empty theme string to select ECharts' default theme over an injected theme.
- Detected deep theme and init-option mutations even when Vue batches them with object replacements.
- Replayed the latest automatic option after a theme change, including graphic-only options, while avoiding duplicate replay for an already-applied theme.
- Re-initialized the chart when `init-options` or `manual-update` mode changes and cleared `group` when the prop is removed.
- Stopped deeply observing `option` in manual mode. The initial component-managed render still honors `update-options`; later manual calls use only their own `setOption` arguments.
- Preserved positional `setOption(option, notMerge, lazyUpdate)` calls and gave an early manual call precedence over an autoresize-deferred initial render.
- Stopped chart-level watchers, observers, listeners, and slot state when the public component is disposed; unmounting also cancels the remaining Vue scope and pending graphic work.
- Kept the chart alive across DOM moves and disposed it only when the custom-element root remains disconnected after the current microtask.
- Kept server rendering side-effect free: Vue SSR emits the chart container and ECharts initializes only after browser mount.

### Autoresize and styles

- Observed the actual ECharts host container and used `ResizeObserver` content-box dimensions rather than relying on the outer component root.
- Skipped zero-sized and unchanged resizes, applied the configured throttle to recovery from zero size as well, and invoked `onResize` only after a real chart resize.
- Resized before the autoresize-deferred first option commit and cancelled the observer and pending throttle work synchronously during cleanup.
- Preserved the original import-time base-style injection and ensured it remains present in both published JavaScript entry bundles.
- Kept `vue-echarts/style.css` as the explicit stylesheet for shadow roots, other documents, and CSP environments that cannot use the automatic inline fallback.

### Performance and maintainability

- Avoided deep option tracking in manual mode, disabled autoresize layout reads, redundant listener rebinding, repeated loading traversals, and duplicate graphic flushes.
- Coalesced Vue-side graphic changes and batched theme/slot-driven option work while retaining normal ECharts merge behavior.
- Simplified lifecycle ownership, update signatures, callback-slot state, listener tables, graphic collection/order bookkeeping, and resize cleanup.
- Removed speculative retry, rollback, restoration, and malformed-input paths from runtime code; the component now owns Vue scheduling and cleanup without attempting to recover failed third-party ECharts operations.
- Consolidated tests around public behavior and valid typed inputs while retaining focused unit coverage for update planning and graphic option construction.

### Build, release, and documentation

- Corrected the global CDN bundle to use the full `echarts` package as one external dependency while preserving the component's named exports on the default global export.
- Added package declaration builds against the minimum supported Vue and ECharts versions, `publint` release validation, generated-document checks, and package preview publishing in CI.
- Made tag/package-version mismatches fail before release, derived npm dist-tags safely for prereleases, and validated the final package before publishing.
- Documented style scope, Vue SSR behavior, smart-update decisions, manual mode, loading effects, event aliases, callback-slot paths, graphic components, public properties and methods, and typed template refs in both English and Chinese.
- Updated non-major development dependencies and retained security overrides without adding runtime dependencies.

## 8.1.0

### New features

- Added `vue-echarts/graphic` and `#graphic` slot support to build and update ECharts `graphic` trees with Vue components.

### Fixes

- Fixed theme-switch regressions by replaying the latest `option` after `setTheme`, so delayed data assignment (e.g. async graph `series.data`/`links`) no longer disappears on theme changes (#972).
- Fixed smart-update normalization when option keys migrate across shapes (e.g. object to array/scalar), preventing valid next values from being overwritten during updates.
- Fixed an update regression in `vue-echarts/graphic` slot behavior that could break some demos and runtime updates (#976).

## 8.1.0-beta.2

### Fixes

- Fixed an update regression in `vue-echarts/graphic` slot behavior that could break some demos and runtime updates (#976).

## 8.1.0-beta.1

### New features

- Added `vue-echarts/graphic` and `#graphic` slot support to build and update ECharts `graphic` trees with Vue components.

### Fixes

- Fixed theme-switch regressions by replaying the latest `option` after `setTheme`, so delayed data assignment (e.g. async graph `series.data`/`links`) no longer disappears on theme changes (#972).
- Fixed smart-update normalization when option keys migrate across shapes (e.g. object to array/scalar), preventing valid next values from being overwritten during updates.

## 8.0.1

### Fixes

- Clarified that `manual-update` and reactive `option` updates are mutually exclusive—manual charts now ignore prop changes after the first render.
- Optimized the slot handling logic.

## 8.0.0

### Breaking changes

- Updated peer dependency for `echarts` to `^6.0.0`.
- Updated peer dependency for `vue` to `^3.3.0`.
- Dropped support for browsers without native `class` support.
- Removed `vue-echarts/csp` entry. Use `vue-echarts` instead. Only manually include `vue-echarts/style.css` if you are **both** enforcing a strict CSP that prevents inline `<style>` injection and targeting browsers that don't support the [`CSSStyleSheet()` constructor](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet#browser_compatibility).

### New features

- ECharts 6 support.
- Added slots for tooltip and data view.
- Added support for getter in provide/inject.
- Added [smart update](https://github.com/ecomfe/vue-echarts/blob/main/README.md#smart-update) strategy to make updates more effortless.
- Made CSS `border-radius` work out-of-the-box.

### Chore

- Built with tsdown.
- Switched demo from webpack to rolldown-vite.
- Switched to ESLint flat config.
- Added unit test with Vitest.

## 8.0.0-beta.3

- Made CSS `border-radius` work out-of-the-box.

## 8.0.0-beta.2

- Added [smart update](https://github.com/ecomfe/vue-echarts/blob/main/README.md#smart-update) strategy to make updates more effortless.

## 8.0.0-beta.1

### Breaking changes

- Updated peer dependency for `echarts` to `^6.0.0`.
- Updated peer dependency for `vue` to `^3.3.0`.
- Dropped support for browsers without native `class` support.
- Removed `vue-echarts/csp` entry. Use `vue-echarts` instead. Only manually include `vue-echarts/style.css` if you are **both** enforcing a strict CSP that prevents inline `<style>` injection and targeting browsers that don't support the [`CSSStyleSheet()` constructor](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet#browser_compatibility).

### New features

- ECharts 6 support.
- Added slots for tooltip and data view.
- Added support for getter in provide/inject.

### Chore

- Built with tsdown.
- Switched Demo from Webpack to Rolldown-Vite.
- Use ESLint flat config.

## 7.0.3

- Fixed type for `autoresize` (again).

## 7.0.2

- Fixed style injection regression (#805).

## 7.0.1

- Fixed type for `autoresize`.

## 7.0.0

> Other prerelease changes:
>
> - [7.0.0-beta.0](#700-beta0)

- Fixed types for events.

## 7.0.0-beta.0

- Upgraded to ESM.
- Removed the `postinstall` script.
- API remains the same.

### Breaking changes

- Peer deps for `echarts` is upgraded to `^5.5.1`.
- Dropped support for browsers without `ResizeObserver`. Can work with [resize-observer-polyfill](https://www.npmjs.com/package/resize-observer-polyfill).
- Dropped support for Vue < 2.7.
- Dropped CJS outputs.
- Dropped extra wrapper element so that you should no longer set `padding` on the component root.
- For strict CSP usage, `vue-echarts/csp` should now be used as the entry point and `vue-echarts/csp/style.css` should be included manually.

## 6.7.3

- Fixed that `padding` on the component root doesn't work.

## 6.7.2

- Fixed that charts inside `<keep-alive>` failed to display after activation.

## 6.7.1

- Fixed that native events won't actually trigger.

## 6.7.0

- Added supports for native DOM events binding with the `native:` prefix.

## 6.6.10

- Fixed that `autoresize` doesn't work when reducing the height or the root element.

## 6.6.9

- Fixed that the chart may not be the same size as the component root element ([#761](https://github.com/ecomfe/vue-echarts/issues/761)).

## 6.6.8

- Fixed the postinstall script to patch the correct `types` entry for Vue 2.7.

## 6.6.7

- Added missing type file for Vue 2.7.

## 6.6.6

- Fixed types for Vue < 2.7.

## 6.6.5

- Fixed type for `option` regressed in v6.6.2.

## 6.6.4

- Fixed style regression introduced by v6.6.3.

## 6.6.3

- Fixed inner wrapper styles.

## 6.6.2

- Fixed that tooltips may affected by internal styling by VueECharts.

## 6.6.1

- Make `padding` work out-of-the-box.

## 6.6.0

- Added support for `autoresize` accepting an options object to specify custom throttle delay or resize callback.

## 6.5.5

- Removed the custom element registration enhancement for strict CSP builds so that they won't contain `new Function`.

## 6.5.4

- Cleaned up the `console.log` call sneaked in by mistake.

## 6.5.3

- Fixed default behavior for `notMerge` option (#691).

## 6.5.2

- Added `dist/csp/*` to support strict CSP with extracted CSS file.

## 6.5.1

- Fixed types for mouse events.

## 6.5.0

- Use more precise typings for all event params.
- Updated peer deps for `echarts` to `^5.4.1`.

## 6.4.1

- Improve typings for mouse event params.

## 6.4.0

- Delay the disposal of the ECharts instance to the moment the element is disconnected from the DOM if possible (#433).

## 6.3.3

- Make autoresize work for grid layout by default (#675).

## 6.3.2

- Added basic types for events (only event names).

## 6.3.1

- Revert the style change to prevent tooltips from being clipped.

## 6.3.0

- Injected values can now be wrapped in an object so that they can be reactive in Vue 2.

## 6.2.4

- Fixed that attributes were not outputted onto the chart root element for Vue 2 (#670).

## 6.2.3

- Fixed the problem that `v-on` stops working after upgrading to `vue@2.7.x`.

## 6.2.2

- Improve types for `update-options`.

## 6.2.1

- Improved types for provide/inject API.

## 6.2.0

- Added support for Vue 2.7+.

## 6.1.0

- Added support for `.once` event modifier.

## 6.0.3

- Improved typings for Vue 2 version.

## 6.0.2

- Make `notMerge` option still respect `update-options`.
- The default behavior of `notMerge` now revert to checking if there is a reference change for the `option` prop.

## 6.0.1

- Update should always be `notMerge: true`.
- Update dependency version for vue-demi.

## 6.0.0

- Update dependency versions.

## 6.0.0-rc.6

- Revert the change of `updateOptions.lazyUpdate`. It defaults to `false` again.
- Fixed the occasional error caused by the internal implementation of ECharts.
- Removed unexpected `console.log` call.

## 6.0.0-rc.5

- Changed `updateOptions.lazyUpdate` to `true` by default. ([#533](https://github.com/ecomfe/vue-echarts/issues/533#issuecomment-809883909))
- Only perform an additional `resize` call after init within a task. ([#533](https://github.com/ecomfe/vue-echarts/issues/533#issuecomment-809883909))
- The `.chart` getter API now works for Vue 2. (#542)

## 6.0.0-rc.4

- Fix type error for `Vue2` reference.

## 6.0.0-rc.3

- Add missing types file for Vue 2.

## 6.0.0-rc.2

- Fix postinstall script.

## 6.0.0-rc.1

- Move inital resize timing earlier into microtasks so that minimize visual layout shift.
- Add a postinstall script to bail out type check for Vue 2 environment.

## 6.0.0-beta.7

- Ensure charts fit to container after the next UI render. (#518)

## 6.0.0-beta.6

- Ensure VCA is always installed.

## 6.0.0-beta.5

- Remove deps for `mergeProps` as it's not yet implemented in `@vue/composition-api`. (#519)

## 6.0.0-beta.4

- Suppress native events and only handles chart events. (#516)

## 6.0.0-beta.3

- Update `vue-demi` version to fix type error.

## 6.0.0-beta.2

- Fix injection keys for UMD bundle.
- Add `vue-demi` to UMD bundle.

## 6.0.0-beta.1

- Use a custom element for the root element to make default style less specific.

## 6.0.0-alpha.5

- Fix event support for Vue 2.

## 6.0.0-alpha.4

- Add missing injection key exports.

## 6.0.0-alpha.3

- Add missing dependencies for `vue-demi` and `resize-detector`.

## 6.0.0-alpha.2

- Fix bundling for UMD build.

## 6.0.0-alpha.1

### Breaking changes

- Update peer dependency for `echarts` to `^5.0.2`.
- Update peer dependency for `vue` to `^2.6.11 || ^3.0.0`.
- Now `@vue/composition-api` is required to be installed to use Vue ECharts with Vue 2.
- `options` is renamed to **`option`** to align with ECharts itself.
- Updating `option` will respect **`update-options`** configs instead of checking reference change.
- `watch-shallow` is removed. Use **`manual-update`** for performance critical scenarios.
- `mergeOptions` is renamed to **`setOption`** to align with ECharts itself.
- `showLoading` and `hideLoading` is removed. Use the **`loading` and `loading-options`** props instead.
- `appendData` is removed. (Due to ECharts 5's breaking change.)
- All static methods are removed from `vue-echarts`. Use those methods from `echarts` directly.
- Computed getters (`width`, `height`, `isDisposed` and `computedOptions`) are removed. Use the **`getWidth`, `getHeight`, `isDisposed` and `getOption`** methods instead.
- Now the root element of the component have **`100%×100%`** size by default, instead of `600×400`.

### New features

- ECharts 5 support.
- Vue 3 support.
- TypeScript support.
- Add new `update-options` prop and support providing default from context.
- Add new `loading` prop and support providing default from context.
- Add new `loading-options` prop and support providing default from context.
- Support providing default from context for the `theme` prop.

## 5.0.0-beta.0

- Update peer dependency for `vue` to `^2.4.0`. **BREAKING**

## 4.1.0

- Fix the problem that `mergeOptions` didn't use the correct options if the instance is inited on-the-fly.
- Expose ZRender events via `zr:` prefixed events.
- Update to `echarts@4.5.0` (only affects the bundled version).

## 4.0.4

- Update to `echarts@4.3.0` (only affects the bundled version).

## 4.0.3

- Update to `resize-detector@0.1.10`.

## 4.0.2

- Make `manual-update` truely responsive.

## 4.0.1

- Fix `legendscroll` event.

## 4.0.0

- Release 4.0.0.

## 4.0.0-beta.1

- Fix autoresize.

## 4.0.0-beta.0

- Move `echarts` into `peerDependencies`. **BREAKING**
- Rename `auto-resize` to `autoresize`. **BREAKING**
- Point `module` entry to the source version. **BREAKING**
- Switch to Vue CLI 3 for demo.

## 3.1.2

- Fix the problem that `setOption` is always called with `notMerge: true`.

## 3.1.1

- Fix the problem that `options` are not watched as expected.

## 3.1.0

- Add `manual-update` prop to handle performance critical scenarios.
- Deprecate `watch-shallow` prop as it was actually not working as expected.
- Fix the computed getters by using `Object.defineProperties` directly instead of Vue's `computed` as it no longer works as expected after Vue 2.0.
- Remove `chart` from `data` to gain a performance boost.

## 3.0.9

- Update to `resize-detector@0.1.7` to better handle initial resize callback.

## 3.0.8

- Add new events and API to adapt the latest version of ECharts.

## 3.0.7

- Only apply optimization introduce in last version for charts resize from `0` area.

## 3.0.6

- Optimize `auto-resize` for initially hidden (`display: none`) charts.

## 3.0.5

- Update to `resize-detector@0.1.5`.

## 3.0.4

- Fix misused `MutationObserver` (#200).

## 3.0.3

- Update to `resize-detector@0.1.2`.

## 3.0.2

- Update ECharts to `4.0.2`.

## 3.0.1

- Fix npm distribution.

## 3.0.0

- Added support for ECharts 4.
- `auto-resize` now listens to element size change instead of window.
- Remove deprecated `chart` prefixed events.

## 2.6.0

- Added `watchShallow` prop to manually disable deep watch on `options` to optimize performance for charts with large amout of data.
- Made all props reactive.
- Updated ECharts dependency to `^3.8.5`.

## 2.5.1

- Updated ECharts dependency to `3.8.2`+ to fix module breaking change introduced in `3.8.0`.

## 2.5.0

- Fixed collision with Vue's internal methods by removing `_` prefix.
- `mergeOptions` now accept same arguments as ECharts' `setOption` method.
- Updated ECharts dependency to 3.7.2+.

## 2.4.1

- Made `theme` reactive.
- Added `focusnodeadjacency` & `unfocusnodeadjacency` events.
- Fixed the problem that charts won't refresh after `keep-alive` components are activated.

## 2.4.0

- Add `computedOptions`.

## 2.3.9

- Replace publish npm scripts with shell commands to prevent failure upon npm install.

## 2.3.8

- Fixed the problem that styles are missing for precompiled version.

## 2.3.7

- Switch back to `Vue.util.warn`.
- Switch build tool to rollup.

## 2.3.6

- Hot fix for last version. Use `console.warn` temporarily.

## 2.3.5

- Mark Vue as an external dependency in webpack config.

## 2.3.4

- Use `Vue.util.warn` directly.

## 2.3.3

- Fix NPM package.

## 2.3.2

- Fix the implementation of `disconnect`.

## 2.3.1

- Correctly dispose ECharts instance before component is destroyed.
- Fix the problem that `group` is not properly initialized.

## 2.3.0

- As native events are now not listened by `v-on` in Vue.js 2.0, change mouse events name to original ones (keeping emitting `chart*` events for now).
- Fix getter for `width` / `height` / `isDisposed`.
- `options` is now optional to initialize the component and the chart will be initialized automatically when `options` is set.

## 2.2.0

- Add `auto-resize`.
- Refined demo.

## 2.1.0

- Fix `disconnect`.
- When importing `ECharts.vue`, only ECharts core will be imported instead of the whole ECharts bundle.

## 2.0.0

- Update Vue dependency to `2.0.1`.
- Add support for new methods & events for ECharts.
- Fix missing arguments for some APIs.

## 0.1.2

- Update ECharts version.
- Remove unnecessary files from NPM package.

## 0.1.1

- Fix usage in README.

## 0.1.0

- First version.
