import {
  defineComponent,
  shallowRef,
  toRefs,
  watch,
  computed,
  inject,
  onMounted,
  onBeforeUnmount,
  h,
  nextTick,
  watchEffect,
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
import { useGraphic } from "./graphic/runtime";
import { warnMissingGraphicEntry } from "./graphic/warn";
import { useReactiveChartListeners, useReactiveEventAttrs } from "./core/events";
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

import "./style.ts";

const wcRegistered = register();

export const THEME_KEY: InjectionKey<ThemeInjection> = Symbol();
export const INIT_OPTIONS_KEY: InjectionKey<InitOptionsInjection> = Symbol();
export const UPDATE_OPTIONS_KEY: InjectionKey<UpdateOptionsInjection> = Symbol();
export { LOADING_OPTIONS_KEY } from "./composables";

export default defineComponent({
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

    const { autoresize, manualUpdate, loading, loadingOptions } = toRefs(props);

    const realTheme = computed(() => props.theme || toValue(defaultTheme));
    const realInitOptions = computed(
      () => props.initOptions || toValue(defaultInitOptions) || undefined,
    );
    const realUpdateOptions = computed(() => props.updateOptions || toValue(defaultUpdateOptions));

    const { nonEventAttrs, nativeListeners } = useReactiveEventAttrs(attrsMap);

    const { render: renderSlot, patchOption } = useSlotOption(slots, requestUpdate);

    const { patchOption: patchGraphicOption, render: renderGraphic } =
      useGraphic({
        chart,
        slots,
        manualUpdate,
        requestUpdate,
        warn,
      }) ?? {};

    let lastSignature: Signature | undefined;

    function withGraphicReplaceMerge(updateOptions?: UpdateOptions): UpdateOptions | undefined {
      if (!slots.graphic || !patchGraphicOption) {
        return updateOptions;
      }

      const replaceMerge = [...(updateOptions?.replaceMerge ?? []), "graphic"];
      return {
        ...updateOptions,
        replaceMerge: [...new Set(replaceMerge)],
      };
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      override?: UpdateOptions,
      manual = false,
    ): void {
      const slotted = patchOption(option);
      const patched = patchGraphicOption ? patchGraphicOption(slotted) : slotted;

      if (manual) {
        instance.setOption(patched, withGraphicReplaceMerge(override) ?? {});
        lastSignature = undefined;
        return;
      }

      if (override) {
        const planned = planUpdate(lastSignature, patched);
        instance.setOption(patched, withGraphicReplaceMerge(override));
        lastSignature = planned.signature;
        return;
      }

      if (realUpdateOptions.value) {
        instance.setOption(patched, withGraphicReplaceMerge(realUpdateOptions.value));
        lastSignature = undefined;
        return;
      }

      const planned = planUpdate(lastSignature, patched);
      const updateOptions: UpdateOptions = {
        notMerge: planned.plan.notMerge,
      };
      const replacements = (planned.plan.replaceMerge ?? []).filter(
        (key): key is string => key != null,
      );
      if (replacements.length > 0) {
        updateOptions.replaceMerge = [...new Set(replacements)];
      }
      instance.setOption(planned.option, withGraphicReplaceMerge(updateOptions));
      lastSignature = planned.signature;
    }

    function requestUpdate(updateOptions?: UpdateOptions): boolean {
      const instance = chart.value;
      const option = props.option;
      if (!instance || !option || manualUpdate.value) {
        return false;
      }

      applyOption(instance, option, updateOptions);
      return true;
    }

    if (slots.graphic && !patchGraphicOption) {
      warn(warnMissingGraphicEntry());
    }

    useReactiveChartListeners(chart, attrsMap);

    function cleanup(): void {
      const instance = chart.value;
      if (instance) {
        instance.dispose();
        chart.value = undefined;
      }
      isReady.value = false;
      lastSignature = undefined;
    }

    function init(): void {
      isReady.value = false;

      const host = chartHost.value as HTMLDivElement;
      const instance = (chart.value = initChart(host, realTheme.value, realInitOptions.value));

      if (props.group) {
        instance.group = props.group;
      }

      function resize(): void {
        if (!instance.isDisposed()) {
          instance.resize();
        }
      }

      function commit(): void {
        const option = props.option;
        if (!option) {
          return;
        }

        if (manualUpdate.value) {
          applyOption(instance, option, undefined, true);
          return;
        }

        applyOption(instance, option);
      }

      if (autoresize.value) {
        nextTick(() => {
          resize();
          commit();
          isReady.value = true;
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

      const updateOptions = typeof notMerge === "boolean" ? { notMerge, lazyUpdate } : notMerge;

      const instance = chart.value;
      if (!instance) {
        return;
      }

      applyOption(instance, option, updateOptions ?? undefined, true);
    };

    watch(
      () => props.option,
      (option) => {
        if (!option) {
          lastSignature = undefined;
          return;
        }

        if (manualUpdate.value) {
          warn("`option` prop changes are ignored when `manual-update` is `true`.");
          return;
        }

        const instance = chart.value;
        if (!instance) {
          return;
        }

        applyOption(instance, option);
      },
      { deep: true },
    );

    watch(
      [manualUpdate, realInitOptions],
      () => {
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
        const instance = chart.value;
        if (instance) {
          instance.setTheme(theme || {});

          if (props.option && !manualUpdate.value) {
            applyOption(instance, props.option);
          }
        }
      },
      {
        deep: true,
      },
    );

    watchEffect(() => {
      const instance = chart.value;
      if (props.group && instance) {
        instance.group = props.group;
      }
    });

    const publicApi = usePublicAPI(chart);

    useLoading(chart, loading, loadingOptions);

    useAutoresize(chart, autoresize, root);

    onMounted(init);

    onBeforeUnmount(() => {
      if (wcRegistered && root.value) {
        root.value.__dispose = cleanup;
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

      if (isReady.value) {
        const teleported = renderSlot();
        if (teleported) {
          children.push(teleported);
        }
      }

      if (renderGraphic) {
        const graphic = renderGraphic();
        if (graphic) {
          children.push(graphic);
        }
      }

      return h(
        TAG_NAME,
        {
          ...nonEventAttrs.value,
          ...nativeListeners.value,
          ref: root,
          class: ["echarts", nonEventAttrs.value.class],
        },
        children,
      );
    }) as unknown as typeof exposed & PublicMethods;
  },
});
