import { defineComponent, shallowRef, onBeforeUnmount, h, Teleport } from "vue";

export default defineComponent({
  name: "VChartTooltip",
  methods: {} as { formatter: (params: any) => HTMLDivElement | undefined },
  setup(_, { slots, expose }) {
    const container = document?.createElement("div");
    const initialized = shallowRef(false);
    const state = shallowRef<any>();

    function formatter(params: any) {
      initialized.value = true;
      state.value = params;
      return container;
    }

    onBeforeUnmount(() => {
      container?.remove();
    });

    expose({ formatter });

    return () => {
      const slotContent = initialized.value
        ? slots.default?.(state.value)
        : undefined;
      return h(Teleport as any, { to: container }, slotContent);
    };
  },
});
