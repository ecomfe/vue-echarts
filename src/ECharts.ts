/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  ref,
  unref,
  shallowRef,
  toRefs,
  watch,
  computed,
  inject,
  onMounted,
  onUnmounted,
  h,
  PropType,
  watchEffect
} from "vue-demi";
import { init as initChart } from "echarts/core";
import {
  EChartsType,
  InitOptions,
  InitOptionsInjection,
  Option,
  UpdateOptions,
  UpdateOptionsInjection,
  Theme
} from "./types";
import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps
} from "./composables";
import "./style.css";

export const INIT_OPTIONS_KEY = "ecInitOptions";
export const UPDATE_OPTIONS_KEY = "ecUpdateOptions";
export { LOADING_OPTIONS_KEY } from "./composables";

export default defineComponent({
  name: "echarts",
  props: {
    option: Object as PropType<Option>,
    theme: {
      type: [Object, String] as PropType<Theme>
    },
    initOptions: Object as PropType<InitOptions>,
    updateOptions: Object as PropType<UpdateOptions>,
    group: String,
    manualUpdate: Boolean,
    ...autoresizeProps,
    ...loadingProps
  },
  setup(props, { attrs }) {
    const defaultInitOptions = inject(
      INIT_OPTIONS_KEY,
      {}
    ) as InitOptionsInjection;
    const defaultUpdateOptions = inject(
      UPDATE_OPTIONS_KEY,
      {}
    ) as UpdateOptionsInjection;
    const root = ref<HTMLElement>();
    const chart = shallowRef<EChartsType>();
    const manualOption = shallowRef<Option>();
    const realOption = computed(
      () => manualOption.value || props.option || Object.create(null)
    );
    const realInitOptions = computed(() => ({
      ...unref(defaultInitOptions),
      ...props.initOptions
    }));
    const realUpdateOptions = computed(() => ({
      ...unref(defaultUpdateOptions),
      ...props.updateOptions
    }));
    const { autoresize, manualUpdate, loading, loadingOptions } = toRefs(props);

    function init(option?: Option) {
      if (chart.value || !root.value) {
        return;
      }

      const instance = (chart.value = initChart(
        root.value,
        props.theme,
        realInitOptions.value
      ));

      if (props.group) {
        instance.group = props.group;
      }

      Object.keys(attrs)
        .filter(key => key.indexOf("on") === 0)
        .forEach(key => {
          const handler = attrs[key] as any;

          if (!handler) {
            return;
          }

          if (key.indexOf("onZr:") === 0) {
            instance.getZr().on(key.slice(5).toLowerCase(), handler);
          } else {
            instance.on(key.slice(2).toLowerCase(), handler);
          }
        });

      instance.setOption(option || realOption.value, realUpdateOptions.value);
    }

    function setOption(option: Option, updateOptions?: UpdateOptions) {
      if (props.manualUpdate) {
        manualOption.value = option;
      }

      if (!chart.value) {
        init(option);
      } else {
        chart.value.setOption(option, {
          ...realUpdateOptions.value,
          ...updateOptions
        });
      }
    }

    function cleanup() {
      if (chart.value) {
        chart.value.dispose();
        chart.value = undefined;
      }
    }

    let unwatchOption: (() => void) | null = null;
    watch(
      manualUpdate,
      manualUpdate => {
        if (typeof unwatchOption === "function") {
          unwatchOption();
          unwatchOption = null;
        }

        if (!manualUpdate) {
          unwatchOption = watch(
            () => props.option,
            option => {
              if (!option) {
                return;
              }
              if (!chart.value) {
                init();
              } else {
                chart.value.setOption(option, props.updateOptions);
              }
            },
            { deep: true }
          );
        }
      },
      {
        immediate: true
      }
    );

    watch(
      [() => props.theme, () => props.initOptions],
      () => {
        cleanup();
        init();
      },
      {
        deep: true
      }
    );

    watchEffect(() => {
      if (props.group && chart.value) {
        chart.value.group = props.group;
      }
    });

    const publicApi = usePublicAPI(chart, init);

    useLoading(chart, loading, loadingOptions);

    useAutoresize(chart, autoresize, root, realOption);

    onMounted(() => {
      if (props.option) {
        init();
      }
    });

    onUnmounted(cleanup);

    const exposed = {
      root,
      setOption,
      ...publicApi
    };
    Object.defineProperty(exposed, "chart", {
      get() {
        return unref(chart);
      }
    });

    return exposed;
  },
  render() {
    return h("div", { class: "echarts", ref: "root" });
  }
});
