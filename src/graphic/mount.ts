import {
  Teleport,
  defineComponent,
  getCurrentInstance,
  h,
  onMounted,
  provide,
  shallowRef,
} from "vue";

import { isBrowser } from "../utils";
import type { GraphicCollector } from "./collector";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { createOrderTracker } from "./order";

export const GraphicMount = defineComponent({
  name: "GraphicMount",
  props: {
    collector: {
      type: Object as () => GraphicCollector,
      required: true,
    },
  },
  setup(props, { slots }) {
    const { collector } = props;
    const { beginPass } = collector;
    const detachedRoot = isBrowser() ? document.createElement("div") : undefined;
    // A pre-existing vnode element means Vue is hydrating the empty SSR Teleport.
    const contentReady = shallowRef(!getCurrentInstance()!.vnode.el);
    const parentId = shallowRef<string | null>(null);
    const order = createOrderTracker();

    onMounted(() => (contentReady.value = true));

    provide(GRAPHIC_COLLECTOR_KEY, collector);
    provide(GRAPHIC_PARENT_ID_KEY, parentId);
    provide(GRAPHIC_ORDER_KEY, order.ref);

    return () => {
      beginPass();
      const content = slots.default!();
      order.update(content);

      return h(
        Teleport,
        {
          to: detachedRoot ?? "body",
          disabled: !detachedRoot,
        },
        detachedRoot && contentReady.value ? content : [],
      );
    };
  },
});
