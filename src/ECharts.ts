import {
  defineComponent,
  shallowRef,
  toRef,
  watch,
  computed,
  inject,
  onMounted,
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
import { warn } from "./utils";
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
    register();
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

    const realTheme = computed(() => props.theme ?? toValue(defaultTheme));
    const realInitOptions = computed(
      () => props.initOptions ?? toValue(defaultInitOptions) ?? undefined,
    );
    const realUpdateOptions = computed(() => props.updateOptions ?? toValue(defaultUpdateOptions));

    const rootAttrs = useRootAttrs(attrsMap);

    const { render: renderSlot, patchOption } = useSlotOption(slots, requestUpdate, isReady);

    const { patchOption: patchGraphicOption, render: renderGraphic } =
      useGraphic({
        slots,
        manualUpdate,
        // Graphic is always replaced, so slot-only changes do not alter the source signature.
        requestUpdate: (updateOptions) => requestUpdate(updateOptions, "graphic"),
      }) ?? {};

    // `null` means the last option skipped analysis, so the next smart update must rebuild.
    let lastSignature: Signature | null | undefined;
    let themedChart: EChartsType | undefined;
    let themeUpdatePending = false;
    let optionUpdatePending = false;
    let mounted = false;
    let terminallyDisposed = false;
    let deferredCharts: WeakSet<EChartsType> | undefined;
    const updateFlush = patchGraphicOption ? "post" : "pre";

    function withGraphicReplaceMerge(updateOptions?: UpdateOptions): UpdateOptions | undefined {
      if (!slots.graphic || !patchGraphicOption) {
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
      const slotted = patchOption(option);
      const patched = patchGraphicOption ? patchGraphicOption(slotted) : slotted;

      if (mode) {
        instance.setOption(patched, withGraphicReplaceMerge(override));
        if (mode === "manual") {
          lastSignature = undefined;
        }
        return;
      }

      if (!override && realUpdateOptions.value) {
        instance.setOption(patched, withGraphicReplaceMerge(realUpdateOptions.value));
        lastSignature = null;
        return;
      }

      const planned = planUpdate(lastSignature ?? undefined, slotted);
      let updateOptions = override ?? planned.plan;
      if (lastSignature === null) {
        updateOptions = { ...updateOptions, notMerge: true };
      }
      instance.setOption(patched, withGraphicReplaceMerge(updateOptions));
      lastSignature = planned.signature;
    }

    function requestUpdate(updateOptions?: UpdateOptions, mode?: ApplyMode): boolean {
      const instance = chart.value;
      const option = props.option;
      if (!instance || !option || manualUpdate.value || deferredCharts?.has(instance)) {
        return false;
      }

      applyOption(instance, option, updateOptions, mode);
      return true;
    }

    if (slots.graphic && !patchGraphicOption) {
      warn(
        "Detected `#graphic` slot but no extension is registered. Import from `vue-echarts/graphic` to enable it.",
      );
    }

    useReactiveChartListeners(chart, attrsMap);

    function cleanup(): void {
      const instance = chart.value;
      if (instance) {
        instance.dispose();
        chart.value = undefined;
      }
      themedChart = undefined;
      isReady.value = false;
      lastSignature = undefined;
    }

    function dispose(): void {
      terminallyDisposed = true;
      cleanup();
    }

    function init(): void {
      isReady.value = false;

      ensureStyles(root.value?.getRootNode());

      const host = chartHost.value as HTMLDivElement;
      const instance = (chart.value = initChart(host, realTheme.value, realInitOptions.value));
      themedChart = instance;

      function commit(): void {
        const option = props.option;
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
          instance.resize();
          if (deferred.has(instance) && (!themeUpdatePending || manualUpdate.value)) {
            commit();
          }
          isReady.value = true;
          queueMicrotask(() => deferred.delete(instance));
        });
        return;
      }

      commit();
      isReady.value = true;
    }

    const setOption: SetOptionType = (option, notMerge, lazyUpdate?: boolean) => {
      if (!props.manualUpdate) {
        warn("`setOption` is only available when `manual-update` is `true`.");
        return;
      }

      const updateOptions =
        typeof notMerge === "boolean"
          ? { notMerge, lazyUpdate }
          : (notMerge ?? (lazyUpdate === undefined ? undefined : { lazyUpdate }));

      const instance = chart.value;
      if (!instance) {
        return;
      }

      applyOption(instance, option, updateOptions, "manual");
      deferredCharts?.delete(instance);
    };

    // Mark synchronously so batched option/theme changes coalesce regardless of trigger order.
    watch(
      realTheme,
      () => {
        themedChart = undefined;
        themeUpdatePending = true;
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

        if (!option) {
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
        applyOption(instance, option);
      },
      // Graphic nodes register during render, so update after the collected tree is current.
      { deep: true, flush: updateFlush },
    );

    watch(
      [manualUpdate, realInitOptions],
      () => {
        if (!mounted || terminallyDisposed) {
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
        optionUpdatePending = false;
        nextTick(() => {
          themeUpdatePending = false;
          if (optionUpdatePending) {
            optionUpdatePending = false;
            requestUpdate();
          }
        });
        const instance = chart.value;
        if (instance && instance !== themedChart) {
          themedChart = instance;
          instance.setTheme(theme ?? {});

          if (props.option && !manualUpdate.value) {
            applyOption(instance, props.option);
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

    useLoading(chart, loading, loadingOptions);

    useAutoresize(chart, autoresize, root);

    onMounted(() => {
      register(root.value);
      mounted = true;
      if (!terminallyDisposed) {
        init();
      }
    });

    onBeforeUnmount(() => {
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
      root,
      chart,
    };
    expose({ ...exposed, ...publicApi });

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
