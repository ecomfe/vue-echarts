/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  ref,
  shallowRef,
  toRefs,
  watch,
  computed,
  inject,
  onMounted,
  onUnmounted,
  h,
  PropType
} from "vue";
import { init as initChart } from "echarts/core";
import { EChartsType, OptionType } from "@/types";
import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps
} from "./composables";
import "./style.css";

type InitParameters = Parameters<typeof initChart>;
type ThemeParameter = InitParameters[1];
type InitOptsParameter = InitParameters[2];

export default defineComponent({
  name: "echarts",
  props: {
    options: Object as PropType<OptionType>,
    theme: {
      type: [Object, String] as PropType<ThemeParameter>
    },
    initOptions: Object as PropType<InitOptsParameter>,
    group: String,
    manualUpdate: Boolean,
    ...autoresizeProps,
    ...loadingProps
  },
  setup(props, { attrs }) {
    const defaultInitOptions = inject(
      "echartsInitOptions",
      {}
    ) as InitOptsParameter;
    const root = ref<HTMLElement>();
    const chart = shallowRef<EChartsType>();
    const manualOptions = shallowRef<OptionType>();
    const realOptions = computed(
      () => manualOptions.value || props.options || Object.create(null)
    );

    function init(options?: OptionType) {
      if (chart.value || !root.value) {
        return;
      }

      const instance = (chart.value = initChart(
        root.value,
        props.theme,
        props.initOptions || defaultInitOptions
      ));

      if (props.group) {
        instance.group = props.group;
      }

      Object.keys(attrs)
        .filter(key => key.indexOf(`on`) === 0)
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

      instance.setOption(options || realOptions.value, true);
    }

    function mergeOptions(options: OptionType, ...rest: any[]) {
      if (props.manualUpdate) {
        manualOptions.value = options;
      }

      if (!chart.value) {
        init(options);
      } else {
        chart.value.setOption(options, ...rest);
      }
    }

    function cleanup() {
      if (chart.value) {
        chart.value.dispose();
        chart.value = undefined;
      }
    }

    const {
      theme,
      initOptions,
      group,
      autoresize,
      manualUpdate,
      loading,
      loadingOptions
    } = toRefs(props);
    let unwatchOptions: (() => void) | null = null;
    watch(
      manualUpdate,
      manualUpdate => {
        if (typeof unwatchOptions === "function") {
          unwatchOptions();
          unwatchOptions = null;
        }

        if (!manualUpdate) {
          unwatchOptions = watch(
            () => props.options,
            (val, oldVal) => {
              if (!val) {
                return;
              }
              if (!chart.value) {
                init();
              } else {
                // mutating `options` will lead to merging
                // replacing it with new reference will lead to not merging
                // eg.
                // `this.options = Object.assign({}, this.options, { ... })`
                // will trigger `this.chart.setOption(val, true)
                // `this.options.title.text = 'Trends'`
                // will trigger `this.chart.setOption(val, false)`
                chart.value.setOption(val, val !== oldVal);
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

    watch([theme, initOptions], () => {
      cleanup();
      init();
    });

    watch(
      () => group,
      group => {
        if (group && group.value && chart.value) {
          chart.value.group = group.value;
        }
      }
    );

    const publicApi = usePublicAPI(chart, init);

    useLoading(chart, loading, loadingOptions);

    useAutoresize(chart, autoresize, root, realOptions);

    onMounted(() => {
      if (props.options) {
        init();
      }
    });

    onUnmounted(cleanup);

    return {
      root,
      mergeOptions,
      ...publicApi
    };
  },
  render() {
    return h("div", {
      ref: "root",
      class: "echarts"
    });
  }
});
