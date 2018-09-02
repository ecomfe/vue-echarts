3.1.2
* Fix the problem that `setOption` is always called with `notMerge: true`.

3.1.1
* Fix the problem that `options` are not watched as expected.

3.1.0
* Add `manual-update` prop to handle performance critical scenarios.
* Deprecate `watch-shallow` prop as it was actually not working as expected.
* Fix the computed getters by using `Object.defineProperties` directly instead of Vue's `computed` as it no longer works as expected after Vue 2.0.
* Remove `chart` from `data` to gain a performance boost.

3.0.9
* Update to `resize-detector@0.1.7` to better handle initial resize callback.

3.0.8
* Add new events and API to adapt the latest version of ECharts.

3.0.7
* Only apply optimization introduce in last version for charts resize from `0` area.

3.0.6
* Optimize `auto-resize` for initially hidden (`display: none`) charts.

3.0.5
* Update to `resize-detector@0.1.5`.

3.0.4
* Fix misused `MutationObserver` (#200).

3.0.3
* Update to `resize-detector@0.1.2`.

3.0.2
* Update ECharts to `4.0.2`.

3.0.1
* Fix npm distribution.

3.0.0
* Added support for ECharts 4.
* `auto-resize` now listens to element size change instead of window.
* Remove deprecated `chart` prefixed events.

2.6.0
* Added `watchShallow` prop to manually disable deep watch on `options` to optimize performance for charts with large amout of data.
* Made all props reactive.
* Updated ECharts dependency to `^3.8.5`.

2.5.1
* Updated ECharts dependency to `3.8.2`+ to fix module breaking change introduced in `3.8.0`.

2.5.0
* Fixed collision with Vue's internal methods by removing `_` prefix.
* `mergeOptions` now accept same arguments as ECharts' `setOption` method.
* Updated ECharts dependency to 3.7.2+.

2.4.1
* Made `theme` reactive.
* Added `focusnodeadjacency` & `unfocusnodeadjacency` events.
* Fixed the problem that charts won't refresh after `keep-alive` components are activated.

2.4.0
* Add `computedOptions`.

2.3.9
* Replace publish npm scripts with shell commands to prevent failure upon npm install.

2.3.8
* Fixed the problem that styles are missing for precompiled version.

2.3.7
* Switch back to `Vue.util.warn`.
* Switch build tool to rollup.

2.3.6
* Hot fix for last version. Use `console.warn` temporarily.

2.3.5
* Mark Vue as an external dependency in webpack config.

2.3.4
* Use `Vue.util.warn` directly.

2.3.3
* Fix NPM package.

2.3.2
* Fix the implementation of `disconnect`.

2.3.1
* Correctly dispose ECharts instance before component is destroyed.
* Fix the problem that `group` is not properly initialized.

2.3.0
* As native events are now not listened by `v-on` in Vue.js 2.0, change mouse events name to original ones (keeping emitting `chart*` events for now).
* Fix getter for `width` / `height` / `isDisposed`.
* `options` is now optional to initialize the component and the chart will be initialized automatically when `options` is set.

2.2.0
* Add `auto-resize`.
* Refined demo.

2.1.0
* Fix `disconnect`.
* When importing `ECharts.vue`, only ECharts core will be imported instead of the whole ECharts bundle.

2.0.0
* Update Vue dependency to `2.0.1`.
* Add support for new methods & events for ECharts.
* Fix missing arguments for some APIs.

0.1.2
* Update ECharts version.
* Remove unnecessary files from NPM package.

0.1.1
* Fix usage in README.

0.1.0
* First version.
