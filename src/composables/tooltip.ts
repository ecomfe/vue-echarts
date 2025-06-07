import {
  defineComponent,
  Slot,
  shallowRef,
  createApp,
  onUnmounted,
  type App,
  type DefineComponent,
} from "vue";

export function createTooltipTemplate<Params extends object>() {
  let slot: Slot | undefined;
  let app: App<Element> | undefined;
  const props = shallowRef<Params>();

  const define = defineComponent({
    setup(_, { slots }) {
      return () => {
        slot = slots.default;
      };
    },
  }) as DefineComponent & {
    new (): { $slots: { default(_: Params): any } };
  };

  const formatter = (params: Params) => {
    props.value = params;

    if (!slot) {
      throw new Error(
        `[vue-echarts] Failed to find the definition of tooltip template`,
      );
    }

    if (!app) {
      app = createApp({
        // root component is just a render function
        render() {
          // call the slot function with your props
          // return slot!(props);
          return slot!(props.value);
        },
      });
      app.mount(document.createElement("div"));
    }

    return app._container!.innerHTML;
  };

  onUnmounted(() => {
    app?.unmount();
  });

  return { define, formatter };
}
