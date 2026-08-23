import { computed, onScopeDispose, watchSyncEffect } from "vue";

import type { ComputedRef, Ref } from "vue";
import type { EChartsType } from "../types";
import { createEventInvoker, parseOnEvent } from "../utils";
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
  seenAt: number;
  invoke: { value: EventHandler };
  handler: EventHandler;
};

function getEmitter(instance: EChartsType, zr: boolean): EventEmitter {
  return zr ? (instance.getZr() as EventEmitter) : (instance as EventEmitter);
}

function createBoundHandler(
  emitter: EventEmitter,
  event: string,
  invoke: EventHandler,
  once: boolean,
): EventHandler {
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
  let bindings: Map<string, ListenerBinding> | undefined;
  let consumedSources: Map<string, unknown> | undefined;
  let activeInstance: EChartsType | undefined;
  let scan = 0;

  function clearBindings(): void {
    if (!bindings) {
      return;
    }
    for (const binding of bindings.values()) {
      binding.emitter.off(binding.event, binding.handler);
    }
    bindings = undefined;
  }

  watchSyncEffect(() => {
    const instance = chart.value;
    if (consumedSources) {
      for (const [key, source] of consumedSources) {
        if (attrs[key] !== source) {
          consumedSources.delete(key);
        }
      }
    }
    if (!instance) {
      clearBindings();
      activeInstance = undefined;
      return;
    }

    if (activeInstance && activeInstance !== instance) {
      clearBindings();
    }
    activeInstance = instance;
    scan++;

    for (const key in attrs) {
      const parsed = parseOnEvent(key);
      if (!parsed || parsed.event.startsWith("native:") || parsed.event === "zr:") {
        continue;
      }

      const zr = parsed.event.startsWith("zr:");
      const event = zr ? parsed.event.slice(3) : parsed.event;
      const source = attrs[key];
      const existing = bindings?.get(key);

      if (parsed.once && consumedSources?.get(key) === source) {
        continue;
      }

      if (existing && existing.source === source) {
        existing.seenAt = scan;
        continue;
      }

      const invoke = createEventInvoker(source);
      if (existing && !existing.once && invoke) {
        existing.source = source;
        existing.invoke.value = invoke;
        existing.seenAt = scan;
        continue;
      }

      if (existing) {
        existing.emitter.off(existing.event, existing.handler);
        bindings?.delete(key);
      }

      if (!invoke) {
        continue;
      }

      const emitter = getEmitter(instance, zr);
      const current = { value: invoke };
      const invokeCurrent: EventHandler = (...args) => current.value(...args);
      const handler = createBoundHandler(
        emitter,
        event,
        parsed.once
          ? (...args) => {
              (consumedSources ??= new Map()).set(key, source);
              invokeCurrent(...args);
            }
          : invokeCurrent,
        parsed.once,
      );

      emitter.on(event, handler);
      (bindings ??= new Map()).set(key, {
        emitter,
        event,
        source,
        once: parsed.once,
        seenAt: scan,
        invoke: current,
        handler,
      });
    }

    if (!bindings) {
      return;
    }
    for (const [key, binding] of bindings) {
      if (binding.seenAt === scan) {
        continue;
      }
      binding.emitter.off(binding.event, binding.handler);
      bindings.delete(key);
    }
    if (bindings.size === 0) {
      bindings = undefined;
    }
  });

  onScopeDispose(clearBindings);
}

export function useRootAttrs(attrs: AttrMap): ComputedRef<AttrMap> {
  return computed(() => {
    const result: AttrMap = {};

    for (const key in attrs) {
      const parsed = parseOnEvent(key);
      if (!parsed) {
        result[key] = attrs[key];
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
}
