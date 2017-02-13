2.3.1
* Correctly dispose ECharts instance before component is destroyed.

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
