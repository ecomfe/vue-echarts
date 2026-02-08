import type { Ref, Slots, VNodeChild } from "vue";

import type { EChartsType, Option, UpdateOptions } from "../types";

export type GraphicRequestUpdate = (options?: {
  force?: boolean;
  updateOptions?: UpdateOptions;
}) => boolean;

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

const GRAPHIC_RUNTIME_KEY = Symbol.for("vue-echarts.graphic-runtime");

type GlobalRuntime = typeof globalThis & {
  [GRAPHIC_RUNTIME_KEY]?: GraphicRuntimeFactory;
};

export function registerGraphicRuntime(factory: GraphicRuntimeFactory): void {
  const target = globalThis as GlobalRuntime;
  if (target[GRAPHIC_RUNTIME_KEY]) {
    return;
  }
  target[GRAPHIC_RUNTIME_KEY] = factory;
}

export function useGraphicRuntime(ctx: GraphicRuntimeContext): GraphicRuntime | null {
  const factory = (globalThis as GlobalRuntime)[GRAPHIC_RUNTIME_KEY];
  return factory ? factory(ctx) : null;
}

export function __resetGraphicRuntime(): void {
  (globalThis as GlobalRuntime)[GRAPHIC_RUNTIME_KEY] = undefined;
}
