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

import { usePublicAPI, type PublicMethods } from "./composables/api";
import { useAutoresize, autoresizeProps } from "./composables/autoresize";
import { useLoading, loadingProps } from "./composables/loading";
import { useSlotOption, type SlotsTypes } from "./composables/slot";
import { appendReplaceMerge, hasZeroDimension, isIgnorableWatchChange, warn } from "./utils";
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

import "./style";

const wcRegistered = register();
const SKIP_AUTO_UPDATE = Symbol();
type ApplyMode = "manual" | "graphic" | "theme";

export const THEME_KEY: InjectionKey<ThemeInjection> = Symbol();
export const INIT_OPTIONS_KEY: InjectionKey<InitOptionsInjection> = Symbol();
export const UPDATE_OPTIONS_KEY: InjectionKey<UpdateOptionsInjection> = Symbol();
export { LOADING_OPTIONS_KEY } from "./composables/loading";

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

    const rootAttrs = useRootAttrs(attrs);
    const terminallyDisposed = shallowRef(false);

    const {
      render: renderSlot,
      hasNewSlots,
      patchOption,
    } = useSlotOption(slots, requestUpdate, isReady);

    const { patchOption: patchGraphicOption, render: renderGraphic } =
      useGraphic({
        slots,
        manualUpdate,
        // Graphic is always replaced, so slot-only changes do not alter the source signature.
        requestUpdate: () => requestUpdate("graphic"),
      }) ?? {};

    // `null` means the last option skipped analysis, so the next smart update must rebuild.
    let lastSignature: Signature | null | undefined;
    let lastAutoOption: Option | undefined;
    let themeApplied = false;
    let initOptionsInvalidated = false;
    let optionApplied = false;
    let manualUpdateAtInit = manualUpdate.value;
    let initDeferred = false;
    let graphicSlotApplied = false;
    const updateFlush = patchGraphicOption ? "post" : "pre";

    function getAutoOption(): Option | undefined {
      // A graphic slot is a complete option source even without an `option` prop.
      return (
        props.option ??
        (patchGraphicOption && (slots.graphic || graphicSlotApplied) ? {} : undefined)
      );
    }

    function isCurrent(instance: EChartsType | undefined): instance is EChartsType {
      return instance !== undefined && chart.value === instance && !terminallyDisposed.value;
    }

    function patchUpdateOptions(
      updateOptions: UpdateOptions | undefined,
      forceGraphic: boolean,
    ): UpdateOptions | undefined {
      const hasGraphicSlot = Boolean(patchGraphicOption && slots.graphic);
      const replaceGraphic = forceGraphic || graphicSlotApplied || hasGraphicSlot;
      return replaceGraphic ? appendReplaceMerge(updateOptions, "graphic") : updateOptions;
    }

    function applyTheme(instance: EChartsType): boolean {
      // ECharts ignores setTheme until its first option creates the chart model.
      if (!optionApplied || themeApplied) {
        return false;
      }
      themeApplied = true;
      instance.setTheme(realTheme.value || {});
      return isCurrent(instance);
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      mode?: ApplyMode,
      manualOptions?: UpdateOptions,
    ): void {
      const manual = mode === "manual";
      initDeferred = false;
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
      graphicSlotApplied = Boolean(patchGraphicOption && slots.graphic);
      optionApplied = true;
      if (!skipPlanning) {
        lastSignature = nextSignature;
      }
      if (!manual) {
        lastAutoOption = option;
      }
      instance.setOption(patched, updateOptions);
      if (!isCurrent(instance) || (!manual && lastAutoOption !== option)) {
        return;
      }
      if (mode === "theme") {
        return;
      }
      const themeChanged = applyTheme(instance);
      if (themeChanged && !manual && lastAutoOption === option) {
        applyOption(instance, option, "theme");
      }
    }

    function requestUpdate(mode?: "graphic"): void {
      const instance = chart.value;
      if (!isCurrent(instance) || manualUpdate.value || initDeferred) {
        return;
      }

      const option = getAutoOption() ?? lastAutoOption;
      if (!option) {
        return;
      }
      applyOption(instance, option, mode);
    }

    if (slots.graphic && !patchGraphicOption) {
      warn(
        "Detected `#graphic` slot but no extension is registered. Import from `vue-echarts/graphic` to enable it.",
      );
    }

    const stopListeners = useReactiveChartListeners(chart, attrs);

    function cleanup(): void {
      const instance = chart.value;
      chart.value = undefined;
      isReady.value = false;
      lastSignature = undefined;
      lastAutoOption = undefined;
      initDeferred = false;
      graphicSlotApplied = false;
      instance?.dispose();
    }

    function init(): void {
      initOptionsInvalidated = false;
      manualUpdateAtInit = manualUpdate.value;
      optionApplied = false;

      const host = chartHost.value as HTMLDivElement;
      const instance = initChart(host, realTheme.value, realInitOptions.value);
      chart.value = instance;
      if (!isCurrent(instance)) {
        return;
      }
      themeApplied = true;

      function commit(): void {
        const option = manualUpdate.value ? props.option : getAutoOption();
        if (option) {
          if (manualUpdate.value) {
            applyOption(instance, option, "manual", realUpdateOptions.value ?? undefined);
          } else {
            applyOption(instance, option);
          }
        }
        isReady.value = isCurrent(instance);
      }

      if (autoresize.value) {
        initDeferred = true;
        nextTick(() => {
          if (!isCurrent(instance)) {
            return;
          }
          if (autoresize.value && !hasZeroDimension(host.offsetWidth, host.offsetHeight)) {
            instance.resize();
            if (!isCurrent(instance)) {
              return;
            }
          }
          if (initDeferred) {
            initDeferred = false;
            commit();
          } else {
            isReady.value = true;
          }
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
      if (!isCurrent(instance)) {
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
        themeApplied = false;
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
        if (initOptionsInvalidated || !isCurrent(instance) || initDeferred) {
          return;
        }
        // Let the updated hook apply once the new callback containers exist.
        if (hasNewSlots()) {
          return;
        }
        applyOption(instance, nextOption);
      },
      // Graphic nodes register during render, so update after the collected tree is current.
      { deep: true, flush: updateFlush },
    );

    const stopReinitWatch = watch([manualUpdate, initOptionsRevision], () => {
      if (!chart.value) {
        return;
      }
      cleanup();
      init();
    });

    const stopThemeApplyWatch = watch(
      themeRevision,
      () => {
        const instance = chart.value;
        if (
          !initOptionsInvalidated &&
          manualUpdate.value === manualUpdateAtInit &&
          isCurrent(instance) &&
          !themeApplied
        ) {
          if (!applyTheme(instance)) {
            return;
          }

          // `clear()` deliberately drops the applied option until its source changes again.
          const option = lastAutoOption;
          if (option && !manualUpdate.value && !initDeferred && !hasNewSlots()) {
            applyOption(instance, option, "theme");
          }
        }
      },
      {
        flush: updateFlush,
      },
    );

    const stopGroupWatch = watchSyncEffect(() => {
      const instance = chart.value;
      if (isCurrent(instance)) {
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
      stopListeners();
      cleanup();
    }

    const publicApi = usePublicAPI(chart, dispose, () => terminallyDisposed.value);
    const guardedClear = publicApi.clear;
    publicApi.clear = () => {
      const instance = chart.value;
      if (!isCurrent(instance)) {
        return guardedClear();
      }
      initDeferred = false;
      lastSignature = undefined;
      lastAutoOption = undefined;
      instance.clear();
    };

    onMounted(() => {
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
      if (wcRegistered && element?.isConnected && element.__dispose === null) {
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
        return isCurrent(instance) ? instance : undefined;
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
