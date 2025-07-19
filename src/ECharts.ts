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
} from "vue";
import { init as initChart } from "echarts/core";

import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps,
  useSlotOption,
  type PublicMethods,
} from "./composables";
import { isOn, omitOn, toValue } from "./utils";
import { register, TAG_NAME } from "./wc";

import type { PropType, InjectionKey, SlotsType } from "vue";
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

import "./style.css";

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
  slots: Object as SlotsType<
    Record<"tooltip" | `tooltip-${string}`, any> &
      Record<"dataView" | `dataView-${string}`, Option>
  >,
  inheritAttrs: false,
  setup(props, { attrs, expose, slots }) {
    const root = shallowRef<EChartsElement>();
    const chart = shallowRef<EChartsType>();
    const manualOption = shallowRef<Option>();
    const defaultTheme = inject(THEME_KEY, null);
    const defaultInitOptions = inject(INIT_OPTIONS_KEY, null);
    const defaultUpdateOptions = inject(UPDATE_OPTIONS_KEY, null);

    const { autoresize, manualUpdate, loading, loadingOptions } = toRefs(props);

    const realOption = computed(
      () => manualOption.value || props.option || null,
    );
    const realTheme = computed(
      () => props.theme || toValue(defaultTheme) || {},
    );
    const realInitOptions = computed(
      () => props.initOptions || toValue(defaultInitOptions) || {},
    );
    const realUpdateOptions = computed(
      () => props.updateOptions || toValue(defaultUpdateOptions) || {},
    );
    const nonEventAttrs = computed(() => omitOn(attrs));
    const nativeListeners: Record<string, unknown> = {};

    const listeners: Map<{ event: string; once?: boolean; zr?: boolean }, any> =
      new Map();

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

    function init(option?: Option) {
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
          instance.setOption(patchOption(opt), realUpdateOptions.value);
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
      const updateOptions =
        typeof notMerge === "boolean" ? { notMerge, lazyUpdate } : notMerge;

      if (props.manualUpdate) {
        manualOption.value = option;
      }

      if (!chart.value) {
        init(option);
      } else {
        chart.value.setOption(patchOption(option), updateOptions);
      }
    };

    function cleanup() {
      if (chart.value) {
        chart.value.dispose();
        chart.value = undefined;
      }
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
            (option, oldOption) => {
              if (!option) {
                return;
              }
              if (!chart.value) {
                init();
              } else {
                chart.value.setOption(patchOption(option), {
                  // mutating `option` will lead to `notMerge: false` and
                  // replacing it with new reference will lead to `notMerge: true`
                  notMerge: option !== oldOption,
                  ...realUpdateOptions.value,
                });
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
        chart.value?.setTheme(theme);
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

    const { teleportedSlots, patchOption } = useSlotOption(slots, () => {
      if (!manualUpdate.value && props.option && chart.value) {
        chart.value.setOption(
          patchOption(props.option),
          realUpdateOptions.value,
        );
      }
    });

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
