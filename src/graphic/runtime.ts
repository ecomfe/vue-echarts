import type { Ref, Slots, VNodeChild } from "vue";

import type { EChartsType, Option, UpdateOptions } from "../types";

export type GraphicComposableContext = {
  chart: Ref<EChartsType | undefined>;
  slots: Slots;
  manualUpdate: Ref<boolean>;
  requestUpdate: (updateOptions?: UpdateOptions) => boolean;
  warn: (message: string) => void;
};

export type GraphicComposableResult = {
  patchOption: (option: Option) => Option;
  render: () => VNodeChild;
};

export type GraphicComposable = (context: GraphicComposableContext) => GraphicComposableResult;

let registeredComposable: GraphicComposable | null = null;

export function registerGraphicComposable(composable: GraphicComposable): void {
  if (registeredComposable) {
    return;
  }
  registeredComposable = composable;
}

export function useGraphicComposable(
  context: GraphicComposableContext,
): GraphicComposableResult | null {
  return registeredComposable ? registeredComposable(context) : null;
}

export function __resetGraphicComposable(): void {
  registeredComposable = null;
}
