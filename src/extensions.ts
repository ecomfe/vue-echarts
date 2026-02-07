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

type ExtensionRegistryEntry = {
  factory: VChartExtensionFactory;
  key?: string;
};

function getRegistry(): ExtensionRegistryEntry[] {
  const target = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: ExtensionRegistryEntry[];
  };
  if (!target[REGISTRY_KEY]) {
    target[REGISTRY_KEY] = [];
  }
  return target[REGISTRY_KEY]!;
}

export function registerVChartExtension(
  factory: VChartExtensionFactory,
  options?: { key?: string },
): void {
  const registry = getRegistry();

  if (options?.key && registry.some((entry) => entry.key === options.key)) {
    return;
  }

  if (registry.some((entry) => entry.factory === factory)) {
    return;
  }

  registry.push({
    factory,
    key: options?.key,
  });
}

export function useVChartExtensions(ctx: VChartExtensionContext) {
  const extensions = getRegistry().map((entry) => entry.factory(ctx));

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
    [REGISTRY_KEY]?: ExtensionRegistryEntry[];
  };
  target[REGISTRY_KEY] = [];
}
