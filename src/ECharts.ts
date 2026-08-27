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
import { appendReplaceMerge, hasZeroDimension, isIgnorableWatchChange, warn } from "./utils";
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
  PublicComponent,
} from "./types";
import type { EChartsElement } from "./wc";

import { ensureStyles } from "./style";

const SKIP_AUTO_UPDATE = Symbol();
type ApplyMode = "manual" | "graphic" | "theme";

export const THEME_KEY: InjectionKey<ThemeInjection> = Symbol.for("vue-echarts.theme");
export const INIT_OPTIONS_KEY: InjectionKey<InitOptionsInjection> = Symbol.for(
  "vue-echarts.init-options",
);
export const UPDATE_OPTIONS_KEY: InjectionKey<UpdateOptionsInjection> = Symbol.for(
  "vue-echarts.update-options",
);
export { LOADING_OPTIONS_KEY } from "./composables";

const chartProps = {
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
};

type Bindings = {
  setOption: SetOptionType;
  readonly root: HTMLElement | undefined;
  readonly chart: EChartsType | undefined;
} & PublicMethods;

const ECharts = /* @__PURE__ */ defineComponent({
  name: "Echarts",
  inheritAttrs: false,
  props: chartProps,
  emits: {} as Emits,
  slots: Object as SlotsTypes,
  setup(props, { attrs, expose, slots }) {
    const attrsMap: AttrMap = attrs;
    const root = shallowRef<EChartsElement>();
    const chartHost = shallowRef<HTMLDivElement>();
    const chart = shallowRef<EChartsType>();
    const isReady = shallowRef(false);
    const themeRevision = shallowRef(0);
    const initOptionsRevision = shallowRef(0);
    const defaultTheme = inject(THEME_KEY, null);
    const defaultInitOptions = inject(INIT_OPTIONS_KEY, null);
    const defaultUpdateOptions = inject(UPDATE_OPTIONS_KEY, null);

    const autoresize = toRef(props, "autoresize");
    const manualUpdate = toRef(props, "manualUpdate");
    const loading = toRef(props, "loading");
    const loadingType = toRef(props, "loadingType");
    const loadingOptions = toRef(props, "loadingOptions");

    const realTheme = computed(() => props.theme ?? toValue(defaultTheme) ?? undefined);
    const realInitOptions = computed(
      () => props.initOptions ?? toValue(defaultInitOptions) ?? undefined,
    );
    const realUpdateOptions = computed(() => props.updateOptions ?? toValue(defaultUpdateOptions));

    const rootAttrs = useRootAttrs(attrsMap);
    const terminallyDisposed = shallowRef(false);

    const {
      render: renderSlot,
      hasNewSlots,
      patchOption,
      patchUpdateOptions: patchSlotUpdateOptions,
      commitOption: commitSlotOption,
    } = useSlotOption(slots, requestUpdate, isReady);

    const { patchOption: patchGraphicOption, render: renderGraphic } =
      useGraphic({
        slots,
        manualUpdate,
        disposed: terminallyDisposed,
        // Graphic is always replaced, so slot-only changes do not alter the source signature.
        requestUpdate: () => requestUpdate("graphic"),
      }) ?? {};

    // `null` means the last option skipped analysis, so the next smart update must rebuild.
    let lastSignature: Signature | null | undefined;
    let lastAutoOption: Option | undefined;
    let themedChart: EChartsType | undefined;
    let initOptionsInvalidated = false;
    let themeUpdatePending = false;
    let optionUpdatePending = false;
    let optionReplayRequired = false;
    let clearRevision = 0;
    let optionApplied = false;
    let mounted = false;
    let manualUpdateAtInit = manualUpdate.value;
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
      if (instance === undefined || chart.value !== instance || terminallyDisposed.value) {
        return false;
      }
      if (instance.isDisposed()) {
        dispose();
        return false;
      }
      return true;
    }

    function patchUpdateOptions(
      updateOptions: UpdateOptions | undefined,
      forceGraphic: boolean,
    ): UpdateOptions | undefined {
      updateOptions = patchSlotUpdateOptions(updateOptions);
      const hasGraphicSlot = Boolean(patchGraphicOption && slots.graphic);
      const replaceGraphic = forceGraphic || graphicSlotApplied || hasGraphicSlot;
      return replaceGraphic ? appendReplaceMerge(updateOptions, "graphic") : updateOptions;
    }

    function applyTheme(instance: EChartsType): boolean {
      // ECharts ignores setTheme until its first option creates the chart model.
      if (!optionApplied || !isActive(instance) || instance === themedChart) {
        return false;
      }
      const revision = themeRevision.value;
      instance.setTheme(realTheme.value || {});
      if (!isActive(instance) || themeRevision.value !== revision) {
        return false;
      }
      themedChart = instance;
      return true;
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      mode?: ApplyMode,
      manualOptions?: UpdateOptions,
    ): boolean {
      // `updated` listeners run synchronously and may clear during this attempt.
      const revision = clearRevision;
      const manual = mode === "manual";
      // A failed early manual call must not take precedence over deferred initialization.
      if (!manual) {
        deferredCharts?.delete(instance);
      }
      const slotted = patchOption(option);
      const patched = patchGraphicOption ? patchGraphicOption(slotted) : slotted;
      const forceGraphic = mode === "graphic";
      const skipPlanning = manual || forceGraphic;
      let updateOptions: UpdateOptions | undefined;
      let nextSignature: Signature | null | undefined;

      if (skipPlanning) {
        updateOptions = forceGraphic ? (realUpdateOptions.value ?? undefined) : manualOptions;
      } else if (realUpdateOptions.value) {
        updateOptions = realUpdateOptions.value;
        nextSignature = null;
      } else {
        const planned = planUpdate(lastSignature ?? undefined, slotted);
        // Theme changes restore the first option; actions still need that existing element tree.
        const rebuild =
          !planned.signature.hasAction && (lastSignature === null || mode === "theme");
        updateOptions = rebuild ? { ...planned.plan, notMerge: true } : planned.plan;
        nextSignature = planned.signature;
      }

      updateOptions = patchUpdateOptions(updateOptions, forceGraphic);
      // First and rebuilding updates become the snapshot that ECharts restores on theme changes.
      const replayRequired = optionApplied && !manual && !updateOptions?.notMerge;
      instance.setOption(patched, updateOptions);
      if (manual) {
        deferredCharts?.delete(instance);
      }
      if (!isActive(instance) || clearRevision !== revision) {
        return false;
      }
      commitSlotOption();
      graphicSlotApplied = Boolean(patchGraphicOption && slots.graphic);
      optionApplied = true;
      if (!skipPlanning) {
        lastSignature = nextSignature;
      }
      if (!manual) {
        lastAutoOption = option;
      }
      const themeApplied = applyTheme(instance);
      if (!isActive(instance) || clearRevision !== revision) {
        return false;
      }
      return themeApplied && replayRequired
        ? applyOption(instance, option, "theme")
        : replayRequired;
    }

    function requestUpdate(mode?: "graphic"): void {
      const instance = chart.value;
      if (!isActive(instance) || manualUpdate.value || deferredCharts?.has(instance)) {
        return;
      }

      const option = getAutoOption() ?? lastAutoOption;
      if (!option) {
        return;
      }
      optionReplayRequired = applyOption(instance, option, mode);
    }

    if (!patchGraphicOption) {
      let warned = false;
      const warnMissingGraphic = () => {
        if (terminallyDisposed.value || warned || !slots.graphic) {
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

    const stopListeners = useReactiveChartListeners(chart, attrsMap);

    function cleanup(): void {
      const instance = chart.value;
      try {
        chart.value = undefined;
      } finally {
        isReady.value = false;
        lastSignature = undefined;
        lastAutoOption = undefined;
        themedChart = undefined;
        graphicSlotApplied = false;
        if (instance && !instance.isDisposed()) {
          instance.dispose();
        }
      }
    }

    function init(): void {
      initOptionsInvalidated = false;
      manualUpdateAtInit = manualUpdate.value;
      optionReplayRequired = false;
      optionApplied = false;

      ensureStyles(root.value?.getRootNode());

      const host = chartHost.value as HTMLDivElement;
      const instance = initChart(host, realTheme.value, realInitOptions.value);
      chart.value = instance;
      if (!isActive(instance)) {
        return;
      }
      themedChart = instance;

      function commit(): void {
        try {
          const option = manualUpdate.value ? props.option : getAutoOption();
          if (!option) {
            return;
          }

          if (manualUpdate.value) {
            applyOption(instance, option, "manual", realUpdateOptions.value ?? undefined);
            return;
          }

          applyOption(instance, option);
        } finally {
          isReady.value = isActive(instance);
        }
      }

      if (autoresize.value) {
        const deferred = (deferredCharts ??= new WeakSet());
        deferred.add(instance);
        nextTick(() => {
          if (!isActive(instance)) {
            return;
          }
          if (autoresize.value && !hasZeroDimension(host.offsetWidth, host.offsetHeight)) {
            try {
              instance.resize();
            } catch {
              warn("Initial chart resize failed; continuing initialization.");
            }
            if (!isActive(instance)) {
              return;
            }
          }
          if (deferred.has(instance)) {
            commit();
          } else {
            isReady.value = isActive(instance);
          }
          queueMicrotask(() => {
            if (deferred.delete(instance) && isActive(instance)) {
              requestUpdate();
            }
          });
        });
        return;
      }

      commit();
    }

    const setOption: SetOptionType = (option, notMerge, lazyUpdate?: boolean) => {
      if (!props.manualUpdate) {
        warn("`setOption` is only available when `manual-update` is `true`.");
        return;
      }

      const instance = chart.value;
      if (!isActive(instance)) {
        return;
      }

      const updateOptions =
        typeof notMerge === "boolean"
          ? { notMerge, lazyUpdate }
          : (notMerge ?? (lazyUpdate === undefined ? undefined : { lazyUpdate }));

      applyOption(instance, option, "manual", updateOptions);
    };

    // Mark synchronously so later batched replacements cannot mask nested changes.
    const stopThemeWatch = watch(
      realTheme,
      (theme, previousTheme) => {
        if (isIgnorableWatchChange(theme, previousTheme)) {
          return;
        }
        themeRevision.value++;
        themedChart = undefined;
        themeUpdatePending = true;
      },
      { deep: true, flush: "sync" },
    );

    const stopInitOptionsWatch = watch(
      realInitOptions,
      (options, previousOptions) => {
        if (!isIgnorableWatchChange(options, previousOptions)) {
          initOptionsInvalidated = true;
          initOptionsRevision.value++;
        }
      },
      { deep: true, flush: "sync" },
    );

    const stopOptionWatch = watch(
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
        if (initOptionsInvalidated || !isActive(instance) || deferredCharts?.has(instance)) {
          return;
        }
        // Let the updated hook apply once the new callback containers exist.
        if (hasNewSlots()) {
          return;
        }
        if (themeUpdatePending) {
          optionUpdatePending = true;
          return;
        }
        optionReplayRequired = applyOption(instance, nextOption);
      },
      // Graphic nodes register during render, so update after the collected tree is current.
      { deep: true, flush: updateFlush },
    );

    const stopReinitWatch = watch([manualUpdate, initOptionsRevision], () => {
      if (!mounted || terminallyDisposed.value || chart.value?.isDisposed()) {
        return;
      }
      cleanup();
      init();
    });

    const stopThemeApplyWatch = watch(
      themeRevision,
      () => {
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
          const revision = clearRevision;
          applyTheme(instance);

          const option = getAutoOption() ?? lastAutoOption;
          if (
            replayOption &&
            clearRevision === revision &&
            isActive(instance) &&
            option &&
            !manualUpdate.value &&
            !deferredCharts?.has(instance) &&
            !hasNewSlots()
          ) {
            optionReplayRequired = applyOption(instance, option, "theme");
          }
        }
      },
      {
        flush: updateFlush,
      },
    );

    const stopGroupWatch = watchSyncEffect(() => {
      const instance = chart.value;
      if (isActive(instance)) {
        instance.group = props.group ?? "";
      }
    });
    const stopLoading = useLoading(chart, loading, loadingType, loadingOptions);
    const stopAutoresize = useAutoresize(chart, autoresize, chartHost);

    function dispose(): void {
      if (terminallyDisposed.value) {
        return;
      }
      terminallyDisposed.value = true;
      stopThemeWatch();
      stopInitOptionsWatch();
      stopOptionWatch();
      stopReinitWatch();
      stopThemeApplyWatch();
      stopGroupWatch();
      stopLoading();
      stopAutoresize();
      try {
        cleanup();
      } finally {
        stopListeners();
      }
    }

    const publicApi = usePublicAPI(chart, dispose, () => terminallyDisposed.value);
    const guardedClear = publicApi.clear;
    publicApi.clear = () => {
      const instance = chart.value;
      if (!isActive(instance)) {
        return guardedClear();
      }
      // Native clear may replace the model before failing, so invalidate replay state first.
      clearRevision++;
      deferredCharts?.delete(instance);
      lastSignature = null;
      lastAutoOption = undefined;
      optionReplayRequired = false;
      instance.clear();
      lastSignature = undefined;
    };

    onMounted(() => {
      register(root.value);
      mounted = true;
      if (!terminallyDisposed.value) {
        init();
      }
    });

    onBeforeUnmount(() => {
      if (terminallyDisposed.value) {
        return;
      }
      terminallyDisposed.value = true;
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
        const instance = chart.value;
        return isActive(instance) ? instance : undefined;
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

      if (!terminallyDisposed.value) {
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
}) as PublicComponent<typeof chartProps, Bindings, Emits, SlotsTypes>;

export default ECharts;
