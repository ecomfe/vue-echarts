import type { Ref, Slots, VNodeChild } from "vue";

import type { EChartsType, Option, UpdateOptions } from "./types";

export type RequestUpdate = (options?: {
  force?: boolean;
  updateOptions?: UpdateOptions;
}) => boolean;

export type VChartExtensionContext = {
  chart: Ref<EChartsType | undefined>;
  slots: Slots;
  manualUpdate: Ref<boolean>;
  requestUpdate: RequestUpdate;
  warn: (message: string) => void;
};

export type VChartExtension = {
  patchOption?: (option: Option) => Option;
  render?: () => VNodeChild;
};

export type VChartExtensionFactory = (ctx: VChartExtensionContext) => VChartExtension;

// Module-augment this interface from optional extension entries to add slot typings.
// Example: `vue-echarts/graphic` augments it with `graphic?: unknown`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VChartExtensionSlots {}

const REGISTRY_KEY = Symbol.for("vue-echarts.extensions");

function getRegistry(): VChartExtensionFactory[] {
  const target = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: VChartExtensionFactory[];
  };
  if (!target[REGISTRY_KEY]) {
    target[REGISTRY_KEY] = [];
  }
  return target[REGISTRY_KEY]!;
}

export function registerVChartExtension(factory: VChartExtensionFactory): void {
  getRegistry().push(factory);
}

export function useVChartExtensions(ctx: VChartExtensionContext) {
  const extensions = getRegistry().map((factory) => factory(ctx));

  function patchOption(option: Option): Option {
    let result = option;
    extensions.forEach((extension) => {
      if (extension.patchOption) {
        result = extension.patchOption(result);
      }
    });
    return result;
  }

  function render(): VNodeChild[] {
    return extensions.map((extension) => extension.render?.()).filter((node) => node != null);
  }

  return { patchOption, render, count: extensions.length };
}

// Test helper to reset cached registry.
export function __resetVChartExtensions(): void {
  const target = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: VChartExtensionFactory[];
  };
  target[REGISTRY_KEY] = [];
}
