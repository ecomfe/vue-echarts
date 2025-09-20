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
  warn,
} from "vue";
import { init as initChart } from "echarts/core";
import type { EChartsOption } from "echarts";

import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps,
  useSlotOption,
} from "./composables";
import type { PublicMethods, SlotsTypes } from "./composables";
import { isOn, omitOn } from "./utils";
import { register, TAG_NAME } from "./wc";
import { planUpdate } from "./merge";
import type { Signature, UpdatePlan } from "./merge";

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
export const UPDATE_OPTIONS_KEY: InjectionKey<UpdateOptionsInjection> =
  Symbol();
export { LOADING_OPTIONS_KEY } from "./composables";

export default defineComponent({
  name: "echarts",
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
  inheritAttrs: false,
  setup(props, { attrs, expose, slots }) {
    const root = shallowRef<EChartsElement>();
    const chart = shallowRef<EChartsType>();
    const defaultTheme = inject(THEME_KEY, null);
    const defaultInitOptions = inject(INIT_OPTIONS_KEY, null);
    const defaultUpdateOptions = inject(UPDATE_OPTIONS_KEY, null);

    const { autoresize, manualUpdate, loading, loadingOptions } = toRefs(props);

    const realOption = computed(() => props.option || undefined);
    const realTheme = computed(
      () => props.theme || toValue(defaultTheme) || undefined,
    );
    const realInitOptions = computed(
      () => props.initOptions || toValue(defaultInitOptions) || undefined,
    );
    const realUpdateOptions = computed(
      () => props.updateOptions || toValue(defaultUpdateOptions) || undefined,
    );
    const nonEventAttrs = computed(() => omitOn(attrs));
    const nativeListeners: Record<string, unknown> = {};

    const listeners: Map<{ event: string; once?: boolean; zr?: boolean }, any> =
      new Map();

    const { teleportedSlots, patchOption } = useSlotOption(slots, () => {
      if (!manualUpdate.value && props.option && chart.value) {
        applyOption(chart.value, props.option);
      }
    });

    let lastSignature: Signature | undefined;

    function resolveUpdateOptions(
      plan?: UpdatePlan,
      override?: UpdateOptions,
    ): UpdateOptions {
      const base = realUpdateOptions.value;
      const result: UpdateOptions = {
        ...(override ?? {}),
      };

      const replacements = [
        ...(plan?.replaceMerge ?? []),
        ...(override?.replaceMerge ?? []),
      ].filter((key): key is string => key != null);
      if (replacements.length > 0) {
        result.replaceMerge = [...new Set(replacements)];
      } else {
        delete result.replaceMerge;
      }

      const notMerge = override?.notMerge ?? plan?.notMerge;
      if (notMerge !== undefined) {
        result.notMerge = notMerge;
      } else {
        delete result.notMerge;
      }

      return base ? { ...base, ...result } : result;
    }

    function applyOption(
      instance: EChartsType,
      option: Option,
      override?: UpdateOptions,
      manual = false,
    ) {
      const patched = patchOption(option);

      if (manual) {
        instance.setOption(patched, override ?? {});
        lastSignature = undefined;
        return;
      }

      if (realUpdateOptions.value) {
        const updateOptions = override ?? realUpdateOptions.value;
        instance.setOption(patched, updateOptions);
        lastSignature = undefined;
        return;
      }

      const planned = planUpdate(
        lastSignature,
        patched as unknown as EChartsOption,
      );

      const updateOptions = resolveUpdateOptions(planned.plan, override);
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

        listeners.set({ event, zr, once }, attrs[key]);
      });

    function init(option?: Option, manual = false, override?: UpdateOptions) {
      if (!root.value) {
        return;
      }

      const instance = (chart.value = initChart(
        root.value,
        realTheme.value,
        realInitOptions.value,
      ));

      if (props.group) {
        instance.group = props.group;
      }

      listeners.forEach((handler, { zr, once, event }) => {
        if (!handler) {
          return;
        }

        const target = zr ? instance.getZr() : instance;

        if (once) {
          const raw = handler;

          handler = (...args: any[]) => {
            raw(...args);
            target.off(event, handler);
          };
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore EChartsType["on"] is not compatible with ZRenderType["on"]
        // but it's okay here
        target.on(event, handler);
      });

      function resize() {
        if (instance && !instance.isDisposed()) {
          instance.resize();
        }
      }

      function commit() {
        const opt = option || realOption.value;
        if (opt) {
          applyOption(instance, opt, override, manual);
          override = undefined;
        }
      }

      if (autoresize.value) {
        // Try to make chart fit to container in case container size
        // is changed synchronously or in already queued microtasks
        nextTick(() => {
          resize();
          commit();
        });
      } else {
        commit();
      }
    }
    const setOption: SetOptionType = (
      option,
      notMerge,
      lazyUpdate?: boolean,
    ) => {
      if (!props.manualUpdate) {
        warn(
          "[vue-echarts] setOption is only available when manual-update is true.",
        );
        return;
      }

      const updateOptions =
        typeof notMerge === "boolean" ? { notMerge, lazyUpdate } : notMerge;

      if (!chart.value) {
        init(option, true, updateOptions ?? undefined);
      } else {
        applyOption(chart.value, option, updateOptions ?? undefined, true);
      }
    };

    function cleanup() {
      if (chart.value) {
        chart.value.dispose();
        chart.value = undefined;
      }
      lastSignature = undefined;
    }

    let unwatchOption: (() => void) | null = null;
    watch(
      manualUpdate,
      (manualUpdate) => {
        if (typeof unwatchOption === "function") {
          unwatchOption();
          unwatchOption = null;
        }

        if (!manualUpdate) {
          unwatchOption = watch(
            () => props.option,
            (option) => {
              if (!option) {
                lastSignature = undefined;
                return;
              }
              if (!chart.value) {
                init();
              } else {
                applyOption(chart.value, option);
              }
            },
            { deep: true },
          );
        }
      },
      {
        immediate: true,
      },
    );

    watch(
      realInitOptions,
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
        chart.value?.setTheme(theme || {});
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
    return (() =>
      h(
        TAG_NAME,
        {
          ...nonEventAttrs.value,
          ...nativeListeners,
          ref: root,
          class: ["echarts", nonEventAttrs.value.class],
        },
        teleportedSlots(),
      )) as unknown as typeof exposed & PublicMethods;
  },
});
