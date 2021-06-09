## 6.0.0-rc.6

* Revert the change of `updateOptions.lazyUpdate`. It defaults to `false` again.
* Fixed the occasional error caused by the internal implementation of ECharts.
* Removed unexpected `console.log` call.

## 6.0.0-rc.5

* Changed `updateOptions.lazyUpdate` to `true` by default. ([#533](https://github.com/ecomfe/vue-echarts/issues/533#issuecomment-809883909))
* Only perform an additional `resize` call after init within a task. ([#533](https://github.com/ecomfe/vue-echarts/issues/533#issuecomment-809883909))
* The `.chart` getter API now works for Vue 2. (#542)

## 6.0.0-rc.4

* Fix type error for `Vue2` reference.

## 6.0.0-rc.3

* Add missing types file for Vue 2.

## 6.0.0-rc.2

* Fix postinstall script.

## 6.0.0-rc.1

* Move inital resize timing earlier into microtasks so that minimize visual layout shift.
* Add a postinstall script to bail out type check for Vue 2 environment.

## 6.0.0-beta.7

* Ensure charts fit to container after the next UI render. (#518)

## 6.0.0-beta.6

* Ensure VCA is always installed.

## 6.0.0-beta.5

* Remove deps for `mergeProps` as it's not yet implemented in `@vue/composition-api`. (#519)

## 6.0.0-beta.4

* Suppress native events and only handles chart events. (#516)

## 6.0.0-beta.3

* Update `vue-demi` version to fix type error.

## 6.0.0-beta.2

* Fix injection keys for UMD bundle.
* Add `vue-demi` to UMD bundle.

## 6.0.0-beta.1

* Use a custom element for the root element to make default style less specific.
## 6.0.0-alpha.5

* Fix event support for Vue 2.

## 6.0.0-alpha.4

* Add missing injection key exports.

## 6.0.0-alpha.3

* Add missing dependencies for `vue-demi` and `resize-detector`.

## 6.0.0-alpha.2

* Fix bundling for UMD build.

## 6.0.0-alpha.1

### Breaking changes

* Update peer dependency for `echarts` to `^5.0.2`.
* Update peer dependency for `vue` to `^2.6.11 || ^3.0.0`.
* Now `@vue/composition-api` is required to be installed to use Vue-ECharts with Vue 2.
* `options` is renamed to **`option`** to align with ECharts itself.
* Updating `option` will respect **`update-options`** configs instead of checking reference change.
* `watch-shallow` is removed. Use **`manual-update`** for performance critical scenarios.
* `mergeOptions` is renamed to **`setOption`** to align with ECharts itself.
* `showLoading` and `hideLoading` is removed. Use the **`loading` and `loading-options`** props instead.
* `appendData` is removed. (Due to ECharts 5's breaking change.)
* All static methods are removed from `vue-echarts`. Use those methods from `echarts` directly.
* Computed getters (`width`, `height`, `isDisposed` and `computedOptions`) are removed. Use the **`getWidth`, `getHeight`, `isDisposed` and `getOption`** methods instead.
* Now the root element of the component have **`100%×100%`** size by default, instead of `600×400`.

### New features

* ECharts 5 support.
* Vue 3 support.
* TypeScript support.
* Add new `update-options` prop and support providing default from context.
* Add new `loading` prop and support providing default from context.
* Add new `loading-options` prop and support providing default from context.
* Support providing default from context for the `theme` prop.

## 5.0.0-beta.0

* Update peer dependency for `vue` to `^2.4.0`. **BREAKING**

## 4.1.0

* Fix the problem that `mergeOptions` didn't use the correct options if the instance is inited on-the-fly.
* Expose ZRender events via `zr:` prefixed events.
* Update to `echarts@4.5.0` (only affects the bundled version).

## 4.0.4

* Update to `echarts@4.3.0` (only affects the bundled version).

## 4.0.3

* Update to `resize-detector@0.1.10`.

## 4.0.2

* Make `manual-update` truely responsive.

## 4.0.1

* Fix `legendscroll` event.

## 4.0.0

* Release 4.0.0.

## 4.0.0-beta.1

* Fix autoresize.

## 4.0.0-beta.0

* Move `echarts` into `peerDependencies`. **BREAKING**
* Rename `auto-resize` to `autoresize`. **BREAKING**
* Point `module` entry to the source version. **BREAKING**
* Switch to Vue CLI 3 for demo.

## 3.1.2

* Fix the problem that `setOption` is always called with `notMerge: true`.

## 3.1.1

* Fix the problem that `options` are not watched as expected.

## 3.1.0

* Add `manual-update` prop to handle performance critical scenarios.
* Deprecate `watch-shallow` prop as it was actually not working as expected.
* Fix the computed getters by using `Object.defineProperties` directly instead of Vue's `computed` as it no longer works as expected after Vue 2.0.
* Remove `chart` from `data` to gain a performance boost.

## 3.0.9

* Update to `resize-detector@0.1.7` to better handle initial resize callback.

## 3.0.8

* Add new events and API to adapt the latest version of ECharts.

## 3.0.7

* Only apply optimization introduce in last version for charts resize from `0` area.

## 3.0.6

* Optimize `auto-resize` for initially hidden (`display: none`) charts.

## 3.0.5

* Update to `resize-detector@0.1.5`.

## 3.0.4

* Fix misused `MutationObserver` (#200).

## 3.0.3

* Update to `resize-detector@0.1.2`.

## 3.0.2

* Update ECharts to `4.0.2`.

## 3.0.1

* Fix npm distribution.

## 3.0.0

* Added support for ECharts 4.
* `auto-resize` now listens to element size change instead of window.
* Remove deprecated `chart` prefixed events.

## 2.6.0

* Added `watchShallow` prop to manually disable deep watch on `options` to optimize performance for charts with large amout of data.
* Made all props reactive.
* Updated ECharts dependency to `^3.8.5`.

## 2.5.1

* Updated ECharts dependency to `3.8.2`+ to fix module breaking change introduced in `3.8.0`.

## 2.5.0

* Fixed collision with Vue's internal methods by removing `_` prefix.
* `mergeOptions` now accept same arguments as ECharts' `setOption` method.
* Updated ECharts dependency to 3.7.2+.

## 2.4.1

* Made `theme` reactive.
* Added `focusnodeadjacency` & `unfocusnodeadjacency` events.
* Fixed the problem that charts won't refresh after `keep-alive` components are activated.

## 2.4.0

* Add `computedOptions`.

## 2.3.9

* Replace publish npm scripts with shell commands to prevent failure upon npm install.

## 2.3.8

* Fixed the problem that styles are missing for precompiled version.

## 2.3.7

* Switch back to `Vue.util.warn`.
* Switch build tool to rollup.

## 2.3.6

* Hot fix for last version. Use `console.warn` temporarily.

## 2.3.5

* Mark Vue as an external dependency in webpack config.

## 2.3.4

* Use `Vue.util.warn` directly.

## 2.3.3

* Fix NPM package.

## 2.3.2

* Fix the implementation of `disconnect`.

## 2.3.1

* Correctly dispose ECharts instance before component is destroyed.
* Fix the problem that `group` is not properly initialized.

## 2.3.0

* As native events are now not listened by `v-on` in Vue.js 2.0, change mouse events name to original ones (keeping emitting `chart*` events for now).
* Fix getter for `width` / `height` / `isDisposed`.
* `options` is now optional to initialize the component and the chart will be initialized automatically when `options` is set.

## 2.2.0

* Add `auto-resize`.
* Refined demo.

## 2.1.0

* Fix `disconnect`.
* When importing `ECharts.vue`, only ECharts core will be imported instead of the whole ECharts bundle.

## 2.0.0

* Update Vue dependency to `2.0.1`.
* Add support for new methods & events for ECharts.
* Fix missing arguments for some APIs.

## 0.1.2

* Update ECharts version.
* Remove unnecessary files from NPM package.

## 0.1.1

* Fix usage in README.

## 0.1.0

* First version.
