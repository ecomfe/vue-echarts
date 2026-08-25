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
    const instance = getCurrentInstance()!;
    const { collector } = props;
    const { beginPass } = collector;
    const detachedRoot = shallowRef(isBrowser() ? document.createElement("div") : undefined);
    // A pre-existing vnode element means Vue is hydrating the empty SSR Teleport.
    const contentReady = shallowRef(!instance.vnode.el);
    const parentId = shallowRef<string | null>(null);
    const order = createOrderTracker();

    onMounted(() => {
      // Only the inserted Teleport anchor reveals the component's actual document realm.
      const ownerDocument = (instance.vnode.el as Node).ownerDocument!;
      if (detachedRoot.value?.ownerDocument !== ownerDocument) {
        detachedRoot.value = ownerDocument.createElement("div");
      }
      contentReady.value = true;
    });

    provide(GRAPHIC_COLLECTOR_KEY, collector);
    provide(GRAPHIC_PARENT_ID_KEY, parentId);
    provide(GRAPHIC_ORDER_KEY, order.ref);

    return () => {
      beginPass();
      const content = slots.default!();
      order.update(content);
      const target = detachedRoot.value;

      return h(
        Teleport,
        {
          to: target ?? "body",
          disabled: !target,
        },
        target && contentReady.value ? content : [],
      );
    };
  },
});
