import { Teleport, defineComponent, h, onUnmounted, provide, shallowRef } from "vue";

import { isBrowser } from "../utils";
import type { GraphicCollector } from "./collector";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { collectGraphicOrder } from "./order";

export const GraphicMount = defineComponent({
  name: "GraphicMount",
  props: {
    collector: {
      type: Object as () => GraphicCollector,
      required: true,
    },
  },
  setup(props, { slots }) {
    const detachedRoot = isBrowser() ? document.createElement("div") : undefined;
    const parentId = shallowRef<string | null>(null);
    const orderMapRef = shallowRef<Map<string, number>>(new Map());

    provide(GRAPHIC_COLLECTOR_KEY, props.collector);
    provide(GRAPHIC_PARENT_ID_KEY, parentId);
    provide(GRAPHIC_ORDER_KEY, orderMapRef);

    onUnmounted(() => {
      detachedRoot?.remove();
    });

    return () => {
      props.collector.beginPass();
      const content = slots.default?.();
      const orderMap = new Map<string, number>();
      collectGraphicOrder(content, orderMap, 0);
      orderMapRef.value = orderMap;

      return detachedRoot
        ? h(Teleport, { to: detachedRoot }, h("div", { style: { display: "contents" } }, content))
        : null;
    };
  },
});
