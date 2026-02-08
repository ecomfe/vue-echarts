import type { Ref, Slots, VNodeChild } from "vue";

import type { EChartsType, Option, UpdateOptions } from "../types";

export type GraphicRequestUpdate = (updateOptions?: UpdateOptions) => boolean;

export type GraphicRuntimeContext = {
  chart: Ref<EChartsType | undefined>;
  slots: Slots;
  manualUpdate: Ref<boolean>;
  requestUpdate: GraphicRequestUpdate;
  warn: (message: string) => void;
};

export type GraphicRuntime = {
  patchOption: (option: Option) => Option;
  render: () => VNodeChild;
};

export type GraphicRuntimeFactory = (ctx: GraphicRuntimeContext) => GraphicRuntime;

let factoryRef: GraphicRuntimeFactory | null = null;

export function registerGraphicRuntime(factory: GraphicRuntimeFactory): void {
  if (factoryRef) {
    return;
  }
  factoryRef = factory;
}

export function useGraphicRuntime(ctx: GraphicRuntimeContext): GraphicRuntime | null {
  return factoryRef ? factoryRef(ctx) : null;
}

export function __resetGraphicRuntime(): void {
  factoryRef = null;
}
