import {
  defineComponent,
  Slot,
  shallowRef,
  createVNode,
  render,
  onUnmounted,
  getCurrentInstance,
  type DefineComponent,
} from "vue";

export function createTooltipTemplate<Params extends object>() {
  let slot: Slot | undefined;
  let container: HTMLElement | undefined;
  const props = shallowRef<Params>();
  const internal = getCurrentInstance();

  if (!internal) {
    throw new Error(
      `[vue-echarts] createTooltipTemplate must be used in a setup function`,
    );
  }
  const { appContext } = internal;

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

    if (!container) {
      const component = defineComponent({
        setup() {
          return () => slot!(props.value);
        },
      });
      const vnode = createVNode(component);
      vnode.appContext = appContext;

      container = document.createElement("div");
      render(vnode, container);
    }

    return container;
  };

  onUnmounted(() => {
    if (container) {
      render(null, container);
      container.remove();
    }
  });

  return { define, formatter };
}
