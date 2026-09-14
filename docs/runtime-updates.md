# Runtime update design

The reactive `option` is a complete configuration snapshot. Correctly applying that snapshot is the constraint; model, animation, and interaction continuity determine which correct native operation to prefer. Explicit `updateOptions` and graphic `$action` commands remain native-merge escape hatches.

## Automatic updates and immediate operations

Previously the option, theme, and slot watchers could each submit options independently. A revision counter rejected the continuation of an interrupted native call, but could not cancel another watcher still waiting to run. A simultaneous option/theme change followed by `clear()` from an `updated` handler could therefore restore the cleared chart, depending on prop order.

Automatic sources now accumulate option, graphic, theme, and reinitialization reasons. One post-flush coordinator consumes them after Vue prepares slot containers and graphic nodes. Reinitialization takes precedence; an existing model receives the theme before the latest option. Ordinary simultaneous option/theme changes therefore use two native operations instead of option → theme → option. An instance without its first model still needs that first option before ECharts accepts `setTheme`.

`clear()`, manual `setOption`, and disposal remain immediate. A submission revision guards synchronous reentry. Clear cancels accumulated reasons, pending graphic collection, callback-slot changes awaiting their updated hook, and the old batched source watcher before calling ECharts; its replacement watcher observes changes made by clear's own event handlers. The replacement watcher is explicitly stopped during disposal/unmount. Collector cancellation also absorbs already observed DOM order changes, preventing a later MutationObserver notification from restoring old work.

A generic task queue or synchronous deep watcher was rejected: the former would add cancellation machinery around Vue's existing queue, while the latter would traverse large options once per synchronous mutation. The coordinator batches option traversal and keeps resource-specific resize/loading lifecycles independent.

Resize throttling checks the latest observed dimensions against the live chart dimensions when it executes. The loading watch source reads the chart reference but returns only the active instance's configuration, so deep traversal never enters native chart internals. A single setup watcher retains Vue's component error handling and lifecycle cleanup, including when a loading effect synchronously replaces its own chart.

## Effective input and successful submissions

The source option, callback slots, and graphic slot have distinct ownership. Callback slots inject functions into their paths. A graphic slot owns root `graphic`, so the overridden raw value is excluded from source planning. Previously an ignored raw `$action` could suppress a required reset elsewhere. Planning the generated native payload instead would also confuse implementation commands with caller intent. The graphic extension now builds a declarative tree and plans that tree separately.

The planner stores structure and component identities, without retaining data payload values. Same-ID matching uses maps; graphic element types and explicit parent IDs are part of the signature because ECharts cannot merge a type change or reparent an existing element. It chooses normal merge, component replacement, or full reset according to native behavior. `replaceMerge` merges explicit IDs and preserves their model positions, so it cannot generally remove fields within a matched component or reproduce a different order of surviving IDs. Those changes require reset. Native `$action` compatibility deliberately prevents a full reset that would destroy command targets; describe the resulting tree without commands when full snapshot semantics are needed.

Preparation returns a native option and a commit callback for callback slots and graphics. Only a successful, uninterrupted native call commits their applied records. A thrown call may have partially modified ECharts, so the source baseline becomes untrusted and the next smart submission rebuilds. Explicit native update options retain their requested policy. This fixes callback removal retries that previously lost their cleanup path before `setOption` succeeded.

DOM containers and current slot membership follow Vue's lifecycle rather than a fictitious rollback. Callback functions and parsed paths are cached while the slot exists. Successfully injected path names are retained until the instance is replaced: native theme recreation can replay a callback from an old backup even after its removal succeeded. Subsequent cleanup preserves an explicitly supplied source formatter. This retains only path names, not obsolete callback containers or source options.

Within one preparation, callback paths reuse their writable array and object ancestors. Multiple per-series slots therefore share one copy of the series array without mutating the caller's option or coupling distinct branches that reference the same source object. Slot membership checks use sets rather than repeated linear searches.

## Attributes and events

Vue's setup-context `attrs` is not an ordinary deeply reactive object. A computed root-attribute map and a watcher could miss the first addition of a DOM attribute or chart listener. Root attributes are now normalized on each render. Native listeners synchronize when the instance appears, when the component updates, and before automatic native submissions. Each option/theme operation owns its listener synchronization, avoiding a duplicate scan in the coordinator. The existing reactive listener handling remains useful for handler arrays, and preserves once, aliases, ZRender, replacement, and cleanup behavior.

Only moving binding into `onUpdated` would be insufficient: listeners must already exist when a native option submission emits a synchronous event.

## Graphic collection

Returning `null` from graphic leaves left the collector trying to infer rendered order from ancestor VNodes. A wrapper's key does not identify its internal graphic node, and wrapper-local updates need not rerender the chart. More key/ID inference cannot recover information absent from that VNode.

Each `G*` now renders a small internal element inside the existing detached Teleport target. A group wraps its children. The collector reads their actual DOM order; provide/inject still supplies logical group identity through wrappers and Fragments. MutationObserver catches moves that do not rerender a graphic leaf, and compares order before requesting work. The target remains detached after mounting and preserves the existing iframe adoption and SSR hydration lifecycle. Nodes outside this internal target, for example graphics teleported to another target by application code, are not part of the collected tree.

The collector now caches the ordered node list until registration, removal, or child-list mutation invalidates it. It consumes pending MutationObserver records before reading the cache, so synchronous collection sees wrapper moves and `clear()` still absorbs old order changes. That list is the sole ordering source: option construction consumes it directly without separate node ranks, another snapshot, or per-parent sorting. Value-only updates no longer need a DOM tree walk; building and analyzing the graphic option remain linear in the tree size.

Minimum-runtime testing exposed two Vue 3.3 hydration issues: an empty Teleport target has no server-rendered target anchor, and adding the temporary target during hydration creates an extra host child. SSR now emits a comment placeholder for the graphic mount. Hydration leaves it intact until `onMounted`, then creates the detached target and mounts the Teleport normally. The target itself determines readiness, with no separate reactive flag or disabled Teleport fallback. Ordinary client mounting retains the temporary host attachment needed for iframe adoption.

This costs one DOM marker per graphic node and a linear tree walk when the order cache is invalidated. A custom Vue renderer could eliminate markers, but would introduce another rendering/context/SSR bridge. The measured workloads below support retaining the ordinary Vue renderer for this change; they do not establish a universal crossover point for very large trees.

## Graphic submission and continuity

Previously every graphic change replaced the root tree and resubmitted the complete source option. A changed rectangle recreated unchanged siblings and restarted their animations; unrelated series also reentered native option processing.

Collector versions now identify dirty nodes. A merge-compatible update sends only those elements, using stable IDs and parent IDs. Unchanged elements are omitted, so ECharts retains them and their animators. Versions and the structural signature advance only after native success. Structural changes, field removal, or type changes replace the anonymous graphic component using `replaceMerge: ["graphic"]`. ECharts cannot safely reparent an existing element even with an element-level replacement, so this is the deliberate structural fallback. It preserves unrelated chart models but can restart graphics animations.

Numeric graphic IDs are normalized to strings before collection and remain normalized in native payloads, so version matching and parent references use the same identities. Sparse submission copies outgoing properties only after identifying a dirty node; it does not allocate another property object for every unchanged element.

A graphic-only update omits unrelated source options only while the model is trusted and caller options permit it. `notMerge`, replacement of another component, manual submissions, a cleared model, and failure recovery require the full appropriate snapshot. Simultaneous source/theme changes also take the full source path. We retain an O(n) structural analysis rather than storing deep copies of arbitrary style/shape payloads or implementing another generic diff engine.

Per-type runtime props are selected from the existing shape/style metadata instead of declaring every graphic prop for every component. Runtime validation now follows the public text overrides and rectangle radius distinction, with absent Booleans retaining `undefined`. This reduces per-node initialization and deep-watch work without adding code generation.

## Native theme boundary

ECharts `setTheme` recreates its model using an earlier OptionManager backup. Reapplying the latest automatic snapshot prevents configuration rollback and reapplies controlled interaction state. Uncontrolled legend selection, data zoom, and animations can still reset during theme recreation or another necessary model reset. This is a native boundary, not a promise of transactional state preservation.

Reading `getOption()` and merging the result back was rejected: it includes engine defaults, theme-derived values, and transient state, which would then become caller configuration and obstruct deletion or theme changes. State that must survive belongs in the application's option snapshot. Manual mode keeps native patch semantics and does not replay an automatic source history.

## Demo option analysis

Option evaluation, validation, and dependency extraction live in a directly testable analysis module; the worker only handles request IDs and message transport. It returns dependency names and diagnostics rather than cloning the complete option and repeating dependency traversal on the main thread. Functions within an option, such as tooltip formatters, no longer need to cross the worker boundary. One visited set bounds traversal of shared or cyclic option containers, and one ordered dependency set preserves first appearance without recursive array merging. Formatting preferences remain on the main thread and do not require reevaluation.

Default export selection rejects invalid default values instead of falling back to the module namespace, while retaining the last-variable and CommonJS forms. A five-second main-thread timeout bounds evaluation and dependency extraction, and a failed or blocked worker is replaced before the next request.

The editor uses analysis status and structured issues directly. Error text is carried once in the issues rather than duplicated in the worker response and reactive state; the selected evaluation strategy remains part of the analysis result for direct tests.

The graphic overlay example reads its plot boundaries from native pixel conversion after chart updates. This includes the axis-label adjustments ECharts makes on narrow screens or theme changes. It publishes changed bounds only, so a graphic submission's own update event does not trigger another submission. Percentage-based bounds remain an estimate until the first native layout is available.

## Verification

Behavioral coverage includes prop-order-independent clear, combined source/theme/graphic cancellation, failed source/theme/slot/graphic submissions, callback cleanup after theme replay, first listener and attribute addition, opaque wrappers and child-only Fragment reorder, nested group moves/removals, sibling element and animator identity, safe sparse payloads, explicit native flags, SSR, iframe adoption, and teardown.

The compatibility aliases now pin actual Vue runtime-core 3.3.0 and ECharts 6.0.0, rather than newer versions under minimum-version names. `pnpm build` checks emitted declarations against those packages. Library/demo typechecks, lint, formatting, build, package validation, and the complete browser/node suite are required for this change.

## Local performance comparison

A headless Chromium run compared the pre-change working tree with this implementation using Vue 3.5.41 and ECharts 6.1.0: one 2,000-point line series, 100 or 500 rectangles, five warm-up updates, then 20 sequential `nextTick` updates changing one rectangle. Animation was disabled for timing. The figures are one local sample, not a frame-rate guarantee; bytes and submitted element counts describe this specific payload.

| Graphic nodes | Payload/update before → after | Elements/update before → after | Total time for 20 updates before → after | Native `setOption` time before → after |
| ------------- | ----------------------------- | ------------------------------ | ---------------------------------------- | -------------------------------------- |
| 100           | 22,915 B → 148 B              | 100 → 1                        | 77.6 ms → 65.1 ms                        | 44.6 ms → 30.8 ms                      |
| 500           | 59,715 B → 148 B              | 500 → 1                        | 225.5 ms → 185.0 ms                      | 79.3 ms → 37.1 ms                      |

Both versions made 20 native calls. The previous implementation recreated the unchanged sibling; this implementation retained it. Runtime prop counts changed from 127 for every component to 68 for `GRect`, 37 for `GGroup`, and 88 for `GText`. Total Vue/collection work still grows with the tree; the sparse native payload does not make the complete update O(1).

The final simplification pass removes the obsolete VNode type marker and new-slot gate, consolidates replacement-option normalization, and replaces subtractive shared-prop type inference with the existing common-prop metadata. The supported-element check now mounts every exported graphic component with real ECharts rather than reading an internal marker.

The repeatable `pnpm bench:graphic` harness now covers 100, 500, and 2,000 nodes with five measured rounds. In this single-node, value-only workload, caching DOM order reduces full DOM scans from two per update to zero while retaining one submitted element and unchanged sibling identity. This removes redundant work without changing the remaining O(n) option construction and analysis; wall-time gains should be measured on the workload of interest.

A local comparison against `9490433` (v8.3.0), using Vue 3.5.41 and ECharts 6.1.0 with the same harness, measured median total times of 67.1 → 66.5 ms, 183.4 → 179.2 ms, and 612.6 → 599.2 ms for 20 updates at those three sizes. Both versions submitted one element and 176 bytes per update and preserved the unchanged sibling. These small timing differences do not establish a significant speedup; the repeatable benefit is eliminating two full DOM scans per update.
