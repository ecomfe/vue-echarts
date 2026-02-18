import type { Ref, Slots, VNodeChild } from "vue";

import type { EChartsType, Option, UpdateOptions } from "../types";

export type GraphicContext = {
  chart: Ref<EChartsType | undefined>;
  slots: Slots;
  manualUpdate: Ref<boolean>;
  requestUpdate: (updateOptions?: UpdateOptions) => boolean;
};

export type GraphicRuntime = {
  patchOption: (option: Option) => Option;
  render: () => VNodeChild;
};

let registeredRuntime: ((context: GraphicContext) => GraphicRuntime) | null = null;

export function registerRuntime(factory: (context: GraphicContext) => GraphicRuntime): void {
  if (registeredRuntime) {
    return;
  }
  registeredRuntime = factory;
}

export function useRuntime(context: GraphicContext): GraphicRuntime | null {
  return registeredRuntime ? registeredRuntime(context) : null;
}
