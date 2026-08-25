import {
  defineComponent,
  shallowRef,
  toRef,
  watch,
  computed,
  inject,
  onMounted,
  onUpdated,
  onBeforeUnmount,
  h,
  nextTick,
  watchSyncEffect,
  toValue,
} from "vue";
import { init as initChart } from "echarts/core";

import type { InjectionKey, PropType, VNodeChild } from "vue";

import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps,
  useSlotOption,
} from "./composables";
import type { PublicMethods, SlotsTypes } from "./composables";
import { isIgnorableWatchChange, warn } from "./utils";
import type { AttrMap } from "./utils";
import { register, TAG_NAME } from "./wc";
import { useRuntime as useGraphic } from "./graphic/runtime";
import { useReactiveChartListeners, useRootAttrs } from "./core/events";
import { planUpdate } from "./update";
import type { Signature } from "./update";

import type {
  EChartsType,
  SetOptionType,
  Option,
  Theme,
  ThemeInjection,
  InitOptions,
  InitOptionsInjection,
  UpdateOptions,
  UpdateOptionsInjection,
  Emits,
} from "./types";
import type { EChartsElement } from "./wc";

import { ensureStyles } from "./style";

const SKIP_AUTO_UPDATE = Symbol();
type ApplyMode = "manual" | "graphic";

export const THEME_KEY: InjectionKey<ThemeInjection> = Symbol();
export const INIT_OPTIONS_KEY: InjectionKey<InitOptionsInjection> = Symbol();
export const UPDATE_OPTIONS_KEY: InjectionKey<UpdateOptionsInjection> = Symbol();
export { LOADING_OPTIONS_KEY } from "./composables";

export default /* @__PURE__ */ defineComponent({
  name: "Echarts",
  inheritAttrs: false,
  props: {
    option: Object as PropType<Option>,
    theme: {
      type: [Object, String] as PropType<Theme>,
    },
    initOptions: Object as PropType<InitOptions>,
    updateOptions: Object as PropType<UpdateOptions>,
    group: String,
    manualUpdate: Boolean,
    ...autoresizeProps,
    ...loadingProps,
  },
  emits: {} as Emits,
  slots: Object as SlotsTypes,
  setup(props, { attrs, expose, slots }) {
    const attrsMap: AttrMap = attrs;
    const root = shallowRef<EChartsElement>();
    const chartHost = shallowRef<HTMLDivElement>();
    const chart = shallowRef<EChartsType>();
    const isReady = shallowRef(false);
    const defaultTheme = inject(THEME_KEY, null);
    const defaultInitOptions = inject(INIT_OPTIONS_KEY, null);
    const defaultUpdateOptions = inject(UPDATE_OPTIONS_KEY, null);

    const autoresize = toRef(props, "autoresize");
    const manualUpdate = toRef(props, "manualUpdate");
    const loading = toRef(props, "loading");
    const loadingOptions = toRef(props, "loadingOptions");

    const realTheme = computed(() => props.theme ?? toValue(defaultTheme) ?? undefined);
    const realInitOptions = computed(
      () => props.initOptions ?? toValue(defaultInitOptions) ?? undefined,
    );
    const realUpdateOptions = computed(() => props.updateOptions ?? toValue(defaultUpdateOptions));

    const rootAttrs = useRootAttrs(attrsMap);

    const {
      render: renderSlot,
      patchOption,
      patchUpdateOptions: patchSlotUpdateOptions,
    } = useSlotOption(slots, requestUpdate, isReady);

    const { patchOption: patchGraphicOption, render: renderGraphic } =
      useGraphic({
        slots,
        manualUpdate,
        // Graphic is always replaced, so slot-only changes do not alter the source signature.
        requestUpdate: () => requestUpdate(undefined, "graphic"),
      }) ?? {};

    // `null` means the last option skipped analysis, so the next smart update must rebuild.
    let lastSignature: Signature | null | undefined;
    let themedChart: EChartsType | undefined;
    let themeInvalidated = false;
    let initOptionsInvalidated = false;
    let themeUpdatePending = false;
    let optionUpdatePending = false;
    let optionReplayRequired = false;
    let mounted = false;
    let manualUpdateAtInit = manualUpdate.value;
    let terminallyDisposed = false;
    let deferredCharts: WeakSet<EChartsType> | undefined;
    let graphicSlotApplied = false;
    const updateFlush = patchGraphicOption ? "post" : "pre";

    function getAutoOption(): Option | undefined {
      // A graphic slot is a complete option source even without an `option` prop.
      return (
        props.option ??
        (patchGraphicOption && (slots.graphic || graphicSlotApplied) ? {} : undefined)
      );
    }

    function isActive(instance: EChartsType | undefined): instance is EChartsType {
      return (
        instance !== undefined &&
        chart.value === instance &&
        !terminallyDisposed &&
        !instance.isDisposed()
      );
    }

    function patchUpdateOptions(
      updateOptions?: UpdateOptions,
      forceGraphic = false,
    ): UpdateOptions | undefined {
      updateOptions = patchSlotUpdateOptions(updateOptions);
      const hasGraphicSlot = Boolean(patchGraphicOption && slots.graphic);
      const replaceGraphic = forceGraphic || graphicSlotApplied || hasGraphicSlot;
      graphicSlotApplied = hasGraphicSlot;
      if (!replaceGraphic || updateOptions?.notMerge) {
        return updateOptions;
      }

      const replaceMerge = updateOptions?.replaceMerge;
      const replacements = typeof replaceMerge === "string" ? [replaceMerge] : replaceMerge;
      if (replacements?.includes("graphic")) {
        return updateOptions;
      }
      return {
        ...updateOptions,
        replaceMerge: replacements ? [...replacements, "graphic"] : ["graphic"],
      };
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      override?: UpdateOptions,
      mode?: ApplyMode,
    ): void {
      deferredCharts?.delete(instance);
      const slotted = patchOption(option);
      const patched = patchGraphicOption ? patchGraphicOption(slotted) : slotted;

      if (mode) {
        const replaceGraphic = mode === "graphic";
        const updateOptions = replaceGraphic ? (realUpdateOptions.value ?? undefined) : override;
        instance.setOption(patched, patchUpdateOptions(updateOptions, replaceGraphic));
        return;
      }

      if (!override && realUpdateOptions.value) {
        instance.setOption(patched, patchUpdateOptions(realUpdateOptions.value));
        lastSignature = null;
        return;
      }

      const planned = planUpdate(lastSignature ?? undefined, slotted);
      let updateOptions = override ?? planned.plan;
      if (lastSignature === null) {
        updateOptions = { ...updateOptions, notMerge: true };
      }
      instance.setOption(patched, patchUpdateOptions(updateOptions));
      lastSignature = planned.signature;
    }

    function requestUpdate(updateOptions?: UpdateOptions, mode?: ApplyMode): boolean {
      const instance = chart.value;
      const option = getAutoOption();
      if (!instance || !option || manualUpdate.value || deferredCharts?.has(instance)) {
        return false;
      }

      applyOption(instance, option, updateOptions, mode);
      optionReplayRequired = true;
      return true;
    }

    if (!patchGraphicOption) {
      let warned = false;
      const warnMissingGraphic = () => {
        if (warned || !slots.graphic) {
          return;
        }
        warned = true;
        warn(
          "Detected `#graphic` slot but no extension is registered. Import from `vue-echarts/graphic` to enable it.",
        );
      };
      warnMissingGraphic();
      onUpdated(warnMissingGraphic);
    }

    useReactiveChartListeners(chart, attrsMap);

    function cleanup(): void {
      const instance = chart.value;
      chart.value = undefined;
      instance?.dispose();
      isReady.value = false;
      lastSignature = undefined;
      graphicSlotApplied = false;
    }

    function dispose(): void {
      terminallyDisposed = true;
      cleanup();
    }

    function init(): void {
      initOptionsInvalidated = false;
      manualUpdateAtInit = manualUpdate.value;
      optionReplayRequired = false;

      ensureStyles(root.value?.getRootNode());

      const host = chartHost.value as HTMLDivElement;
      const instance = initChart(host, realTheme.value, realInitOptions.value);
      chart.value = instance;
      if (!isActive(instance)) {
        return;
      }
      themedChart = instance;

      function commit(): void {
        const option = manualUpdate.value ? props.option : getAutoOption();
        if (!option) {
          return;
        }

        if (manualUpdate.value) {
          applyOption(instance, option, undefined, "manual");
          return;
        }

        applyOption(instance, option);
      }

      if (autoresize.value) {
        const deferred = (deferredCharts ??= new WeakSet());
        deferred.add(instance);
        nextTick(() => {
          if (instance.isDisposed()) {
            return;
          }
          if (autoresize.value) {
            instance.resize();
            if (instance.isDisposed()) {
              return;
            }
          }
          if (deferred.has(instance)) {
            commit();
          }
          isReady.value = isActive(instance);
          queueMicrotask(() => {
            if (deferred.delete(instance) && isActive(instance)) {
              requestUpdate();
            }
          });
        });
        return;
      }

      commit();
      isReady.value = isActive(instance);
    }

    const setOption: SetOptionType = (option, notMerge, lazyUpdate?: boolean) => {
      if (!props.manualUpdate) {
        warn("`setOption` is only available when `manual-update` is `true`.");
        return;
      }

      const instance = chart.value;
      if (!instance || terminallyDisposed) {
        return;
      }

      const updateOptions =
        typeof notMerge === "boolean"
          ? { notMerge, lazyUpdate }
          : (notMerge ?? (lazyUpdate === undefined ? undefined : { lazyUpdate }));

      applyOption(instance, option, updateOptions, "manual");
    };

    // Mark synchronously so later batched replacements cannot mask nested changes.
    watch(
      realTheme,
      (theme, previousTheme) => {
        if (isIgnorableWatchChange(theme, previousTheme)) {
          return;
        }
        themeInvalidated = true;
        themedChart = undefined;
        themeUpdatePending = true;
      },
      { deep: true, flush: "sync" },
    );

    watch(
      realInitOptions,
      (options, previousOptions) => {
        if (!isIgnorableWatchChange(options, previousOptions)) {
          initOptionsInvalidated = true;
        }
      },
      { deep: true, flush: "sync" },
    );

    watch(
      () => (manualUpdate.value ? SKIP_AUTO_UPDATE : props.option),
      (option, previousOption) => {
        // Mode changes reinitialize the chart, so the watcher must not update the outgoing instance.
        if (option === SKIP_AUTO_UPDATE || previousOption === SKIP_AUTO_UPDATE) {
          return;
        }

        const nextOption = option ?? getAutoOption();
        if (!nextOption) {
          return;
        }

        const instance = chart.value;
        if (!instance || deferredCharts?.has(instance)) {
          return;
        }

        if (themeUpdatePending) {
          optionUpdatePending = true;
          return;
        }
        applyOption(instance, nextOption);
        optionReplayRequired = true;
      },
      // Graphic nodes register during render, so update after the collected tree is current.
      { deep: true, flush: updateFlush },
    );

    watch(
      [manualUpdate, realInitOptions],
      ([manual], [previousManual]) => {
        if (!mounted || terminallyDisposed) {
          return;
        }
        if (manual === previousManual && !initOptionsInvalidated) {
          return;
        }
        cleanup();
        init();
      },
      {
        deep: true,
      },
    );

    watch(
      realTheme,
      (theme) => {
        if (!themeInvalidated) {
          return;
        }
        themeInvalidated = false;
        // ECharts rebuilds from its initial option snapshot when applying a theme.
        const replayOption = optionReplayRequired || optionUpdatePending;
        optionUpdatePending = false;
        nextTick(() => {
          themeUpdatePending = false;
          if (optionUpdatePending) {
            optionUpdatePending = false;
            requestUpdate();
          }
        });
        const instance = chart.value;
        if (
          !initOptionsInvalidated &&
          manualUpdate.value === manualUpdateAtInit &&
          isActive(instance) &&
          instance !== themedChart
        ) {
          themedChart = instance;
          // ECharts ignores empty theme names instead of resetting to its default theme.
          instance.setTheme(theme || {});

          const option = getAutoOption();
          if (
            replayOption &&
            isActive(instance) &&
            option &&
            !manualUpdate.value &&
            !deferredCharts?.has(instance)
          ) {
            applyOption(instance, option);
            optionReplayRequired = true;
          }
        }
      },
      {
        deep: true,
        flush: updateFlush,
      },
    );

    watchSyncEffect(() => {
      const instance = chart.value;
      if (instance) {
        instance.group = props.group ?? "";
      }
    });

    const publicApi = usePublicAPI(chart, dispose, () => terminallyDisposed);
    const clear = publicApi.clear;
    publicApi.clear = () => {
      const instance = chart.value!;
      clear();
      deferredCharts?.delete(instance);
    };

    useLoading(chart, loading, loadingOptions);

    useAutoresize(chart, autoresize, chartHost);

    onMounted(() => {
      register(root.value);
      mounted = true;
      if (!terminallyDisposed) {
        init();
      }
    });

    onBeforeUnmount(() => {
      if (terminallyDisposed) {
        return;
      }
      terminallyDisposed = true;
      const element = root.value;
      if (register(element) && element?.isConnected && element.__dispose === null) {
        element.__dispose = cleanup;
        return;
      }

      cleanup();
    });

    const exposed = {
      setOption,
      get root(): HTMLElement | undefined {
        return root.value ?? undefined;
      },
      get chart() {
        return terminallyDisposed ? undefined : chart.value;
      },
    };
    expose(Object.assign(exposed, publicApi));

    return (() => {
      const children: VNodeChild[] = [
        h("div", {
          ref: chartHost,
          class: "echarts-host",
        }),
      ];

      const teleported = renderSlot();
      if (teleported) {
        children.push(teleported);
      }

      if (renderGraphic) {
        const graphic = renderGraphic();
        if (graphic) {
          children.push(graphic);
        }
      }

      const forwardedAttrs = rootAttrs.value;

      return h(
        TAG_NAME,
        {
          ...forwardedAttrs,
          ref: root,
          class: ["echarts", forwardedAttrs.class],
        },
        children,
      );
    }) as unknown as typeof exposed & PublicMethods;
  },
});
