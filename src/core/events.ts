import { computed, onScopeDispose, watchEffect } from "vue";

import type { ComputedRef, Ref } from "vue";
import type { EChartsType } from "../types";
import { createEventInvoker, isOn, parseOnEvent } from "../utils";
import type { AttrMap, EventHandler } from "../utils";

type EventEmitter = {
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
};

type ListenerBinding = {
  emitter: EventEmitter;
  event: string;
  source: unknown;
  once: boolean;
  handler: EventHandler;
};

function getEmitter(instance: EChartsType, zr: boolean): EventEmitter {
  return zr ? (instance.getZr() as EventEmitter) : (instance as EventEmitter);
}

function createBoundHandler(
  emitter: EventEmitter,
  event: string,
  value: unknown,
  once: boolean,
): EventHandler | undefined {
  const invoke = createEventInvoker(value);
  if (!invoke) {
    return undefined;
  }

  if (!once) {
    return invoke;
  }

  let called = false;
  const onceHandler: EventHandler = (...args: unknown[]): void => {
    if (called) {
      return;
    }
    called = true;
    emitter.off(event, onceHandler);
    invoke(...args);
  };

  return onceHandler;
}

function toNativeEventKey(event: string, once: boolean): string | null {
  if (!event.startsWith("native:")) {
    return null;
  }

  const nativeEvent = event.slice(7);
  if (!nativeEvent) {
    return null;
  }

  const head = nativeEvent.charAt(0).toUpperCase();
  const tail = nativeEvent.slice(1);
  return `on${head}${tail}${once ? "Once" : ""}`;
}

export function useReactiveChartListeners(
  chart: Ref<EChartsType | undefined>,
  attrs: AttrMap,
): void {
  const bindings = new Map<string, ListenerBinding>();
  let activeInstance: EChartsType | undefined;

  function clearBindings(): void {
    for (const binding of bindings.values()) {
      binding.emitter.off(binding.event, binding.handler);
    }
    bindings.clear();
  }

  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      clearBindings();
      activeInstance = undefined;
      return;
    }

    if (activeInstance && activeInstance !== instance) {
      clearBindings();
    }
    activeInstance = instance;

    const seen = new Set<string>();

    for (const key in attrs) {
      const parsed = parseOnEvent(key);
      if (!parsed || parsed.event.startsWith("native:")) {
        continue;
      }

      const zr = parsed.event.startsWith("zr:");
      const event = zr ? parsed.event.slice(3) : parsed.event;
      const source = attrs[key];
      const emitter = getEmitter(instance, zr);
      const existing = bindings.get(key);

      if (
        existing &&
        existing.source === source &&
        existing.event === event &&
        existing.once === parsed.once
      ) {
        seen.add(key);
        continue;
      }

      if (existing) {
        existing.emitter.off(existing.event, existing.handler);
        bindings.delete(key);
      }

      const handler = createBoundHandler(emitter, event, source, parsed.once);
      if (!handler) {
        continue;
      }

      emitter.on(event, handler);
      bindings.set(key, {
        emitter,
        event,
        source,
        once: parsed.once,
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

  onScopeDispose(clearBindings);
}

export function useReactiveEventAttrs(attrs: AttrMap): {
  nonEventAttrs: ComputedRef<AttrMap>;
  nativeListeners: ComputedRef<AttrMap>;
} {
  const nonEventAttrs = computed(() => {
    const result: AttrMap = {};

    for (const key in attrs) {
      if (isOn(key)) {
        continue;
      }
      result[key] = attrs[key];
    }

    return result;
  });

  const nativeListeners = computed(() => {
    const result: AttrMap = {};

    for (const key in attrs) {
      const parsed = parseOnEvent(key);
      if (!parsed) {
        continue;
      }

      const nativeKey = toNativeEventKey(parsed.event, parsed.once);
      if (!nativeKey) {
        continue;
      }
      result[nativeKey] = attrs[key];
    }

    return result;
  });

  return {
    nonEventAttrs,
    nativeListeners,
  };
}
