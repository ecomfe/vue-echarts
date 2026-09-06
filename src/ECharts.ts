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
import { hasZeroDimension, isIgnorableWatchChange, warn } from "./utils";
import { register, TAG_NAME } from "./wc";
import { useRuntime as useGraphic } from "./graphic/runtime";
import { useReactiveChartListeners, getRootAttrs } from "./core/events";
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
type ApplyMode = "manual" | "graphic";
enum UpdateReason {
  Option = 1,
  Graphic = 2,
  Theme = 4,
  Reinit = 8,
}

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
    const updateRequest = shallowRef(0);
    let pendingUpdate = 0;
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

    const terminallyDisposed = shallowRef(false);

    const {
      render: renderSlot,
      prepare: prepareSlots,
      setReady: setSlotsReady,
      cancelPendingUpdate: cancelSlotUpdate,
    } = useSlotOption(slots, requestUpdate);

    const graphic = useGraphic({
      slots,
      manualUpdate,
      requestUpdate: () => requestUpdate(UpdateReason.Graphic),
    });

    // `null` means the model has no trusted signature, so the next smart update must rebuild.
    let lastSignature: Signature | null | undefined;
    let lastAutoOption: Option | undefined;
    let themeApplied = false;
    let optionApplied = false;
    let initDeferred = false;
    let graphicSlotApplied = false;
    let updateRevision = 0;
    let modelValid = false;

    function getAutoOption(): Option | undefined {
      // A graphic slot is a complete option source even without an `option` prop.
      return props.option ?? (graphic && (slots.graphic || graphicSlotApplied) ? {} : undefined);
    }

    function isCurrent(instance: EChartsType | undefined): instance is EChartsType {
      return instance !== undefined && chart.value === instance && !terminallyDisposed.value;
    }

    function runUpdate(
      instance: EChartsType,
      update: () => void,
      signature: Signature | null | undefined,
    ): boolean {
      const revision = ++updateRevision;
      // A failed native call may have partially changed the model. Only a successful,
      // uninterrupted submission can establish a new smart-update baseline.
      lastSignature = null;
      modelValid = false;
      update();
      if (!isCurrent(instance) || updateRevision !== revision) {
        return false;
      }
      lastSignature = signature;
      modelValid = true;
      return true;
    }

    function applyTheme(instance: EChartsType): boolean {
      // ECharts ignores setTheme until its first option creates the chart model.
      if (!optionApplied || themeApplied) {
        return false;
      }
      const revision = updateRevision + 1;
      // Native update events can submit another option before setTheme returns.
      themeApplied = true;
      try {
        return runUpdate(
          instance,
          () => instance.setTheme(realTheme.value || {}),
          lastSignature === undefined ? undefined : null,
        );
      } catch (error) {
        if (updateRevision === revision) {
          themeApplied = false;
        }
        throw error;
      }
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      mode?: ApplyMode,
      manualOptions?: UpdateOptions,
    ): void {
      const manual = mode === "manual";
      initDeferred = false;
      const preparedSlots = prepareSlots(option);
      const slotted = preparedSlots.option;
      const hasGraphicSlot = Boolean(graphic && slots.graphic);
      // An owned graphic tree is planned separately from the source it overrides.
      const source = hasGraphicSlot ? { ...slotted, graphic: undefined } : slotted;
      let updateOptions = manual ? manualOptions : (realUpdateOptions.value ?? undefined);
      let nextSignature: Signature | null = null;

      const graphicOnly = mode === "graphic" && hasGraphicSlot && graphicSlotApplied && modelValid;
      if (graphicOnly) {
        nextSignature = lastSignature ?? null;
      } else if (!manual && !updateOptions) {
        const planned = planUpdate(lastSignature ?? undefined, source);
        const rebuild = !planned.signature.hasAction && lastSignature === null;
        updateOptions = rebuild ? { ...planned.plan, notMerge: true } : planned.plan;
        nextSignature = planned.signature;
      }

      const replaceMerge = updateOptions?.replaceMerge;
      const replacements = typeof replaceMerge === "string" ? [replaceMerge] : (replaceMerge ?? []);
      const preparedGraphic = graphic?.prepare(
        slotted,
        !modelValid ||
          !graphicSlotApplied ||
          Boolean(updateOptions?.notMerge) ||
          replacements.includes("graphic") ||
          manual,
      );
      let patched = preparedGraphic?.option ?? slotted;
      const replaceGraphic = preparedGraphic?.replace || (graphicSlotApplied && !hasGraphicSlot);
      if (replaceGraphic && !updateOptions?.notMerge && !replacements.includes("graphic")) {
        updateOptions = { ...updateOptions, replaceMerge: [...replacements, "graphic"] };
      }
      const replacesSource = replacements.some((key) => key !== "graphic");
      if (graphicOnly && !updateOptions?.notMerge && !replacesSource) {
        patched = { graphic: patched.graphic };
      }
      syncListeners();
      if (!runUpdate(instance, () => instance.setOption(patched, updateOptions), nextSignature)) {
        return;
      }
      preparedSlots.commit();
      preparedGraphic?.commit();
      graphicSlotApplied = hasGraphicSlot;
      optionApplied = true;
      if (!manual) {
        lastAutoOption = option;
      }
      if (applyTheme(instance) && !manual) {
        applyOption(instance, option);
      }
    }

    function scheduleUpdate(reason: UpdateReason): void {
      pendingUpdate |= reason;
      updateRequest.value++;
    }

    function requestUpdate(reason = UpdateReason.Option): void {
      if (!manualUpdate.value && !initDeferred && !terminallyDisposed.value) {
        scheduleUpdate(reason);
      }
    }

    function flushUpdate(): void {
      const reasons = pendingUpdate;
      pendingUpdate = 0;
      const instance = chart.value;
      if (!reasons || !isCurrent(instance)) {
        return;
      }
      if (reasons & UpdateReason.Reinit) {
        cleanup();
        init();
        return;
      }
      if (initDeferred) {
        return;
      }

      syncListeners();
      const option =
        reasons & (UpdateReason.Option | UpdateReason.Graphic)
          ? (getAutoOption() ?? lastAutoOption)
          : lastAutoOption;
      const needsTheme = !themeApplied && optionApplied;
      if (needsTheme && !applyTheme(instance)) {
        return;
      }
      if (!manualUpdate.value && option) {
        const graphicOnly = reasons === UpdateReason.Graphic && !needsTheme;
        applyOption(instance, option, graphicOnly ? "graphic" : undefined);
      }
    }

    if (slots.graphic && !graphic) {
      warn(
        "Detected `#graphic` slot but no extension is registered. Import from `vue-echarts/graphic` to enable it.",
      );
    }

    const { sync: syncListeners, stop: stopListeners } = useReactiveChartListeners(chart, attrs);

    function cleanup(): void {
      pendingUpdate = 0;
      graphic?.cancelPendingFlush();
      updateRevision++;
      const instance = chart.value;
      chart.value = undefined;
      setSlotsReady(false);
      lastSignature = undefined;
      modelValid = false;
      lastAutoOption = undefined;
      initDeferred = false;
      graphicSlotApplied = false;
      instance?.dispose();
    }

    function init(): void {
      pendingUpdate = 0;
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
        setSlotsReady(isCurrent(instance));
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
            setSlotsReady(true);
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
        themeApplied = false;
        scheduleUpdate(UpdateReason.Theme);
      },
      { deep: true, flush: "sync" },
    );

    const stopInitOptionsWatch = watch(
      realInitOptions,
      (options, previousOptions) => {
        if (!isIgnorableWatchChange(options, previousOptions)) {
          scheduleUpdate(UpdateReason.Reinit);
        }
      },
      { deep: true, flush: "sync" },
    );

    function watchOption() {
      return watch(
        () => (manualUpdate.value ? SKIP_AUTO_UPDATE : props.option),
        (option, previousOption) => {
          if (
            option !== SKIP_AUTO_UPDATE &&
            previousOption !== SKIP_AUTO_UPDATE &&
            (option ?? getAutoOption())
          ) {
            requestUpdate();
          }
        },
        // Batch deep traversal, then submit after Vue has prepared slot containers and graphic nodes.
        { deep: true },
      );
    }
    let stopOptionWatch = watchOption();
    const stopModeWatch = watch(manualUpdate, () => scheduleUpdate(UpdateReason.Reinit), {
      flush: "sync",
    });
    const stopUpdateWatch = watch(updateRequest, flushUpdate, { flush: "post" });

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
      stopModeWatch();
      stopUpdateWatch();
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
      pendingUpdate = 0;
      graphic?.cancelPendingFlush();
      cancelSlotUpdate();
      // Drop earlier queued source changes while observing changes made inside clear's events.
      stopOptionWatch();
      stopOptionWatch = watchOption();
      if (runUpdate(instance, () => instance.clear(), undefined)) {
        lastAutoOption = undefined;
        graphicSlotApplied = false;
        optionApplied = true;
      }
    };

    onMounted(() => {
      if (!terminallyDisposed.value) {
        init();
      }
    });

    onBeforeUnmount(() => {
      stopOptionWatch();
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

        const graphicContent = graphic?.render();
        if (graphicContent) {
          children.push(graphicContent);
        }
      }

      const forwardedAttrs = getRootAttrs(attrs);

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
