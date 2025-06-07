import {
  h,
  render,
  defineComponent,
  Slot,
  Fragment,
  type DefineComponent,
} from "vue";

export function createTooltipTemplate<Params extends object>() {
  let slot: Slot | undefined;

  const define = defineComponent({
    setup(_, { slots }) {
      return () => {
        slot = slots.default;
      };
    },
  }) as DefineComponent & {
    new (): { $slots: { default(_: Params): any } };
  };

  const formatter = (params: Params): HTMLElement[] => {
    if (!slot) {
      throw new Error(
        `[vue-echarts] Failed to find the definition of tooltip template`,
      );
    }

    const container = document.createElement("div");

    const vnode = h(Fragment, null, slot(params));
    // console.log(params);

    render(vnode, container);

    return Array.from(container.children) as HTMLElement[];
  };

  return { define, formatter };
}
