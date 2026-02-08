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

import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps,
  useSlotOption,
} from "./composables";
import type { PublicMethods, SlotsTypes } from "./composables";
import { isOn, omitOn, warn } from "./utils";
import { register, TAG_NAME } from "./wc";
import { planUpdate } from "./update";
import type { Signature } from "./update";
import { useGraphicRuntime } from "./graphic/runtime";
import { warnMissingGraphicEntry } from "./graphic/warn";

import type { PropType, InjectionKey } from "vue";
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
  emits: {} as unknown as Emits,
  slots: Object as SlotsTypes,
  setup(props, { attrs, expose, slots }) {
    const root = shallowRef<EChartsElement>();
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
    const nonEventAttrs = computed(() => omitOn(attrs));
    const nativeListeners: Record<string, unknown> = {};

    const listeners: Array<{ event: string; once?: boolean; zr?: boolean; handler: any }> = [];
    const hasGraphicSlot = (): boolean => Boolean((slots as Record<string, unknown>).graphic);

    const { teleportedSlots, patchOption } = useSlotOption(slots, () => {
      if (!manualUpdate.value && props.option && chart.value) {
        applyOption(chart.value, props.option);
      }
    });

    let lastSignature: Signature | undefined;

    const requestUpdate = (options?: { updateOptions?: UpdateOptions }): boolean => {
      if (!chart.value || !props.option) {
        return false;
      }
      if (manualUpdate.value) {
        return false;
      }
      applyOption(chart.value, props.option, options?.updateOptions);
      return true;
    };

    const graphicRuntime = useGraphicRuntime({
      chart,
      slots,
      manualUpdate,
      requestUpdate,
      warn,
    });

    if (hasGraphicSlot() && !graphicRuntime) {
      warn(warnMissingGraphicEntry());
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      override?: UpdateOptions,
      manual = false,
    ) {
      const slotted = patchOption(option);
      const patched = graphicRuntime ? graphicRuntime.patchOption(slotted) : slotted;

      if (manual) {
        instance.setOption(patched, override ?? {});
        lastSignature = undefined;
        return;
      }

      if (override) {
        const planned = planUpdate(lastSignature, patched);
        instance.setOption(patched, override);
        lastSignature = planned.signature;
        return;
      }

      if (realUpdateOptions.value) {
        instance.setOption(patched, realUpdateOptions.value);
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
      instance.setOption(planned.option, updateOptions);
      lastSignature = planned.signature;
    }

    // We are converting all `on<Event>` props and collect them into `listeners` so that
    // we can bind them to the chart instance later.
    // For `onNative:<event>` props, we just strip the `Native:` part and collect them into
    // `nativeListeners` so that we can bind them to the root element directly.
    Object.keys(attrs)
      .filter((key) => isOn(key))
      .forEach((key) => {
        // Collect native DOM events
        if (key.indexOf("Native:") === 2) {
          // onNative:click -> onClick
          const nativeKey = `on${key.charAt(9).toUpperCase()}${key.slice(10)}`;

          nativeListeners[nativeKey] = attrs[key];
          return;
        }

        // onClick    -> c + lick
        // onZr:click -> z + r:click
        let event = key.charAt(2).toLowerCase() + key.slice(3);

        let zr: boolean | undefined;
        if (event.indexOf("zr:") === 0) {
          zr = true;
          event = event.substring(3);
        }

        let once: boolean | undefined;
        if (event.substring(event.length - 4) === "Once") {
          once = true;
          event = event.substring(0, event.length - 4);
        }

        listeners.push({ event, zr, once, handler: attrs[key] });
      });

    function init() {
      isReady.value = false;
      const instance = (chart.value = initChart(
        root.value,
        realTheme.value,
        realInitOptions.value,
      ));

      if (props.group) {
        instance.group = props.group;
      }

      listeners.forEach(({ zr, once, event, handler }) => {
        if (!handler) {
          return;
        }

        const target = zr ? instance.getZr() : instance;

        let bound = handler;
        if (once) {
          const raw = bound;
          let called = false;

          bound = (...args: any[]) => {
            if (called) {
              return;
            }
            called = true;
            raw(...args);
            target.off(event, bound);
          };
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore EChartsType["on"] is not compatible with ZRenderType["on"]
        // but it's okay here
        target.on(event, bound);
      });

      function resize() {
        if (!instance.isDisposed()) {
          instance.resize();
        }
      }

      function commit() {
        const { option } = props;

        if (manualUpdate.value) {
          if (option) {
            applyOption(instance, option, undefined, true);
          }
          return;
        }

        if (option) {
          applyOption(instance, option);
        }
      }

      if (autoresize.value) {
        // Try to make chart fit to container in case container size
        // is changed synchronously or in already queued microtasks
        nextTick(() => {
          resize();
          commit();
          isReady.value = true;
        });
      } else {
        commit();
        isReady.value = true;
      }
    }
    const setOption: SetOptionType = (option, notMerge, lazyUpdate?: boolean) => {
      if (!props.manualUpdate) {
        warn("`setOption` is only available when `manual-update` is `true`.");
        return;
      }

      const updateOptions = typeof notMerge === "boolean" ? { notMerge, lazyUpdate } : notMerge;

      if (!chart.value) {
        return;
      }

      applyOption(chart.value, option, updateOptions ?? undefined, true);
    };

    function cleanup() {
      if (chart.value) {
        chart.value.dispose();
        chart.value = undefined;
      }
      isReady.value = false;
      lastSignature = undefined;
    }

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

        if (!chart.value) {
          return;
        }

        applyOption(chart.value, option);
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

          if (hasGraphicSlot() && props.option && !manualUpdate.value) {
            applyOption(instance, props.option, { replaceMerge: ["graphic"] });
          }
        }
      },
      {
        deep: true,
      },
    );

    watchEffect(() => {
      if (props.group && chart.value) {
        chart.value.group = props.group;
      }
    });

    const publicApi = usePublicAPI(chart);

    useLoading(chart, loading, loadingOptions);

    useAutoresize(chart, autoresize, root);

    onMounted(() => {
      init();
    });

    onBeforeUnmount(() => {
      if (wcRegistered && root.value) {
        // For registered web component, we can leverage the
        // `disconnectedCallback` to dispose the chart instance
        // so that we can delay the cleanup after exsiting leaving
        // transition.
        root.value.__dispose = cleanup;
      } else {
        cleanup();
      }
    });

    const exposed = {
      setOption,
      root,
      chart,
    };
    expose({ ...exposed, ...publicApi });

    // While `expose()` exposes methods and properties to the parent component
    // via template refs at runtime, it doesn't contribute to TypeScript types.
    // This type casting ensures TypeScript correctly types the exposed members
    // that will be available when using this component.
    return (() => {
      const children = [];
      if (isReady.value) {
        children.push(teleportedSlots());
      }
      if (graphicRuntime) {
        children.push(graphicRuntime.render());
      }
      return h(
        TAG_NAME,
        {
          ...nonEventAttrs.value,
          ...nativeListeners,
          ref: root,
          class: ["echarts", nonEventAttrs.value.class],
        },
        children,
      );
    }) as unknown as typeof exposed & PublicMethods;
  },
});
