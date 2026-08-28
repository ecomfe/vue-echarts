import { computed, onScopeDispose, watchSyncEffect } from "vue";

import type { ComputedRef, Ref } from "vue";
import type { EChartsType } from "../types";
import { createEventInvoker, hasEventHandler, isOn, parseOnEvent } from "../utils";
import type { AttrMap, EventHandler } from "../utils";

type EventEmitter = {
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
};

type ListenerBinding = {
  emitter: EventEmitter;
  event: string;
  source: unknown;
  handler: EventHandler;
};

const NATIVE_EVENT_PREFIX = "onNative:";

export function useReactiveChartListeners(
  chart: Ref<EChartsType | undefined>,
  attrs: AttrMap,
): () => void {
  const bindings = new Map<string, ListenerBinding>();
  const consumedSources = new Map<string, unknown>();
  const seen = new Set<string>();
  let boundChart: EChartsType | undefined;

  function clearBindings(): void {
    for (const binding of bindings.values()) {
      binding.emitter.off(binding.event, binding.handler);
    }
    bindings.clear();
  }

  const stopWatch = watchSyncEffect(() => {
    seen.clear();
    const instance = chart.value;
    for (const [key, source] of consumedSources) {
      if (attrs[key] !== source) {
        consumedSources.delete(key);
      }
    }
    if (!instance) {
      clearBindings();
      boundChart = undefined;
      return;
    }

    if (boundChart && boundChart !== instance) {
      clearBindings();
    }
    boundChart = instance;

    for (const key in attrs) {
      const parsed = parseOnEvent(key);
      if (!parsed || parsed.event.startsWith("native:") || parsed.event === "zr:") {
        continue;
      }

      const zr = parsed.event.startsWith("zr:");
      const event = (zr ? parsed.event.slice(3) : parsed.event).toLowerCase();
      const source = attrs[key];
      const existing = bindings.get(key);

      if (parsed.once && consumedSources.get(key) === source) {
        continue;
      }

      if (existing && existing.source === source && hasEventHandler(source)) {
        seen.add(key);
        continue;
      }

      const invoke = createEventInvoker(source);
      if (existing) {
        existing.emitter.off(existing.event, existing.handler);
        bindings.delete(key);
      }

      if (!invoke) {
        continue;
      }

      const emitter = zr ? (instance.getZr() as EventEmitter) : (instance as EventEmitter);
      let handler = invoke;
      if (parsed.once) {
        handler = (...args): void => {
          bindings.delete(key);
          consumedSources.set(key, source);
          emitter.off(event, handler);
          invoke(...args);
        };
      }

      emitter.on(event, handler);
      bindings.set(key, {
        emitter,
        event,
        source,
        handler,
      });
      seen.add(key);
    }

    for (const [key, binding] of bindings) {
      if (seen.has(key)) {
        continue;
      }
      binding.emitter.off(binding.event, binding.handler);
      bindings.delete(key);
    }
  });

  const stop = () => {
    stopWatch();
    clearBindings();
  };
  onScopeDispose(stop);
  return stop;
}

export function useRootAttrs(attrs: AttrMap): ComputedRef<AttrMap> {
  return computed(() => {
    const result: AttrMap = {};

    for (const key in attrs) {
      if (key.startsWith(NATIVE_EVENT_PREFIX)) {
        const event = key.slice(NATIVE_EVENT_PREFIX.length);
        if (event) {
          result[`on:${event}`] = attrs[key];
        }
        continue;
      }
      if (!isOn(key)) {
        result[key] = attrs[key];
      }
    }

    return result;
  });
}
