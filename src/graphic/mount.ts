import {
  Teleport,
  defineComponent,
  getCurrentInstance,
  h,
  onBeforeMount,
  onMounted,
  provide,
  shallowRef,
} from "vue";

import { isBrowser } from "../utils";
import type { GraphicCollector } from "./collector";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";

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
    const detachedRoot = shallowRef<HTMLDivElement>();
    // A pre-existing vnode element means Vue is hydrating the empty SSR Teleport.
    const contentReady = shallowRef(isBrowser() && !instance.vnode.el);
    const parentId = shallowRef<string | null>(null);

    onBeforeMount(() => {
      // Keeping the target inside the host lets iframe adoption finish before child mounted hooks.
      const host = instance.parent?.subTree.el as HTMLElement | undefined;
      if (host) {
        const target = host.ownerDocument.createElement("div");
        host.appendChild(target);
        detachedRoot.value = target;
        collector.setRoot(target);
      }
    });

    onMounted(() => {
      const ownerDocument = (instance.vnode.el as Node).ownerDocument!;
      const target = detachedRoot.value;
      target?.remove();
      if (target?.ownerDocument !== ownerDocument) {
        detachedRoot.value = ownerDocument.createElement("div");
        collector.setRoot(detachedRoot.value);
      }
      contentReady.value = true;
    });

    provide(GRAPHIC_COLLECTOR_KEY, collector);
    provide(GRAPHIC_PARENT_ID_KEY, parentId);

    return () => {
      beginPass();
      const content = slots.default!();
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
