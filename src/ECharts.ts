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
} from "vue-demi";
import { init as initChart } from "echarts/core";
import { EChartsType, OptionType } from "./types";
import {
  usePublicAPI,
  useAutoresize,
  autoresizeProps,
  useLoading,
  loadingProps
} from "./composables";

type InitParameters = Parameters<typeof initChart>;
type ThemeParameter = InitParameters[1];
type InitOptsParameter = InitParameters[2];

export default defineComponent({
  name: "echarts",
  props: {
    option: Object as PropType<OptionType>,
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
    const manualOption = shallowRef<OptionType>();
    const realOption = computed(
      () => manualOption.value || props.option || Object.create(null)
    );

    function init(option?: OptionType) {
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

      instance.setOption(option || realOption.value, true);
    }

    function setOption(option: OptionType, ...rest: any[]) {
      if (props.manualUpdate) {
        manualOption.value = option;
      }

      if (!chart.value) {
        init(option);
      } else {
        chart.value.setOption(option, ...rest);
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
            (val, oldVal) => {
              if (!val) {
                return;
              }
              if (!chart.value) {
                init();
              } else {
                // mutating `option` will lead to merging
                // replacing it with new reference will lead to not merging
                // eg.
                // `this.option = Object.assign({}, this.option, { ... })`
                // will trigger `this.chart.setOption(val, true)
                // `this.option.title.text = 'Trends'`
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

    useAutoresize(chart, autoresize, root, realOption);

    onMounted(() => {
      if (props.option) {
        init();
      }
    });

    onUnmounted(cleanup);

    return {
      root,
      setOption,
      ...publicApi
    };
  },
  render() {
    return h("div", { ref: "root" });
  }
});
