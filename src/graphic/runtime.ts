import type { Ref, Slots, VNodeChild } from "vue";

import type { Option } from "../types";

export type GraphicContext = {
  slots: Slots;
  manualUpdate: Ref<boolean>;
  requestUpdate: () => void;
};

type GraphicRuntime = {
  patchOption: (option: Option) => Option;
  render: () => VNodeChild;
};

let runtimeFactory: ((context: GraphicContext) => GraphicRuntime) | null = null;

export function registerRuntime(factory: (context: GraphicContext) => GraphicRuntime): void {
  runtimeFactory = factory;
}

export function useRuntime(context: GraphicContext): GraphicRuntime | null {
  return runtimeFactory ? runtimeFactory(context) : null;
}
