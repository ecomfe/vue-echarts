import {
  h,
  Teleport,
  onUnmounted,
  shallowRef,
  type ShallowRef,
  type Slots,
} from "vue";
import { parseProperties } from "../utils";
import type { Option } from "src/types";

export function useTooltip(slots: Slots) {
  const tooltipSlots = Object.fromEntries(
    Object.entries(slots).filter(
      ([key]) => key === "tooltip" || key.startsWith("tooltip:"),
    ),
  );
  const initialized: Record<string, ShallowRef<boolean>> = {};
  const params: Record<string, ShallowRef<any>> = {};
  const containers: Record<string, HTMLElement> = {};
  const properties: Record<string, string[]> = {};

  Object.keys(tooltipSlots).forEach((key) => {
    initialized[key] = shallowRef(false);
    params[key] = shallowRef(null);
    properties[key] =
      key === "tooltip" ? [] : parseProperties(key.replace("tooltip:", ""));
    containers[key] = document?.createElement("div");
  });

  const teleportedSlots = () =>
    Object.keys(tooltipSlots).map((key) => {
      const slot = tooltipSlots[key];
      const slotContent = initialized[key].value
        ? slot?.({ params: params[key].value })
        : undefined;
      return h(Teleport as any, { to: containers[key] }, slotContent);
    });

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
        initialized[key].value = true;
        params[key].value = p;
        return containers[key];
      };
    });
  }

  onUnmounted(() => {
    Object.values(containers).forEach((container) => {
      container?.remove();
    });
  });

  return {
    teleportedSlots,
    mutateOption,
  };
}
