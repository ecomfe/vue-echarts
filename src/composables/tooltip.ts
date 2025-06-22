import { h, Teleport, onUnmounted, shallowReactive, type Slots } from "vue";
import { parseProperties } from "../utils";
import type { Option } from "src/types";

export function useTooltip(slots: Slots) {
  const tooltipSlots = Object.fromEntries(
    Object.entries(slots).filter(
      ([key]) => key === "tooltip" || key.startsWith("tooltip:"),
    ),
  );
  const detachedRoot = document?.createElement("div");
  const containers = shallowReactive<Record<string, HTMLElement>>({});
  const initialized = shallowReactive<Record<string, boolean>>({});
  const params = shallowReactive<Record<string, any>>({});
  const properties = Object.fromEntries(
    Object.keys(tooltipSlots).map((key) => [
      key,
      key === "tooltip" ? [] : parseProperties(key.replace("tooltip:", "")),
    ]),
  );

  const teleportedSlots = () => {
    return h(
      Teleport as any,
      { to: detachedRoot },
      Object.keys(tooltipSlots).map((key) => {
        const slot = tooltipSlots[key];
        const slotContent = initialized[key]
          ? slot?.({ params: params[key] })
          : undefined;
        return h(
          "div",
          { ref: (el) => (containers[key] = el as HTMLElement) },
          slotContent,
        );
      }),
    );
  };

  function mutateOption(option: Option) {
    Object.keys(tooltipSlots).forEach((key) => {
      let current: any = option;
      for (const prop of properties[key]) {
        current = current[prop];
        if (current == null) {
          console.warn(
            `[vue-echarts] "option.${key.replace("tooltip:", "")}" is not defined`,
          );
          return;
        }
      }
      current.tooltip ??= {};
      current.tooltip.formatter = (p: any) => {
        initialized[key] = true;
        params[key] = p;
        return containers[key];
      };
    });
  }

  onUnmounted(() => {
    detachedRoot?.remove();
  });

  return {
    teleportedSlots,
    mutateOption,
  };
}
