import type { Ref, Slots, VNodeChild } from "vue";

import type { EChartsType, Option, UpdateOptions } from "../types";

export type GraphicContext = {
  chart: Ref<EChartsType | undefined>;
  slots: Slots;
  manualUpdate: Ref<boolean>;
  requestUpdate: (updateOptions?: UpdateOptions) => boolean;
  warn: (message: string) => void;
};

export type GraphicRuntime = {
  patchOption: (option: Option) => Option;
  render: () => VNodeChild;
};

let registeredGraphic: ((context: GraphicContext) => GraphicRuntime) | null = null;

export function registerGraphic(factory: (context: GraphicContext) => GraphicRuntime): void {
  if (registeredGraphic) {
    return;
  }
  registeredGraphic = factory;
}

export function useGraphic(context: GraphicContext): GraphicRuntime | null {
  return registeredGraphic ? registeredGraphic(context) : null;
}
