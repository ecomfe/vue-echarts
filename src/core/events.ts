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
  once: boolean;
  seenAt: number;
  invoke: { value: EventHandler };
  handler: EventHandler;
};

const NATIVE_EVENT_PREFIX = "onNative:";

export function useReactiveChartListeners(
  chart: Ref<EChartsType | undefined>,
  attrs: AttrMap,
): void {
  let bindings: Map<string, ListenerBinding> | undefined;
  let consumedSources: Map<string, unknown> | undefined;
  let activeInstance: EChartsType | undefined;
  let scan = 0;

  function clearBindings(): void {
    const current = bindings;
    bindings = undefined;
    // ECharts disposal already releases both emitters and rejects later off calls.
    if (!current || activeInstance?.isDisposed()) {
      return;
    }
    let errors: unknown[] | undefined;
    for (const binding of current.values()) {
      try {
        binding.emitter.off(binding.event, binding.handler);
      } catch (error) {
        (errors ??= []).push(error);
      }
    }
    if (errors) {
      throw errors[0];
    }
  }

  watchSyncEffect(() => {
    const instance = chart.value;
    if (consumedSources) {
      for (const [key, source] of consumedSources) {
        if (attrs[key] !== source) {
          consumedSources.delete(key);
        }
      }
      if (consumedSources.size === 0) {
        consumedSources = undefined;
      }
    }
    if (!instance || instance.isDisposed()) {
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
      const event = (zr ? parsed.event.slice(3) : parsed.event).toLowerCase();
      const source = attrs[key];
      const existing = bindings?.get(key);

      if (parsed.once && consumedSources?.get(key) === source) {
        continue;
      }

      if (existing && existing.source === source && hasEventHandler(source)) {
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

      const emitter = zr ? (instance.getZr() as EventEmitter) : (instance as EventEmitter);
      const current = { value: invoke };
      const invokeCurrent: EventHandler = (...args) => current.value(...args);
      let handler = invokeCurrent;
      if (parsed.once) {
        let called = false;
        handler = (...args): void => {
          if (called) {
            return;
          }
          called = true;
          emitter.off(event, handler);
          bindings?.delete(key);
          if (bindings?.size === 0) {
            bindings = undefined;
          }
          (consumedSources ??= new Map()).set(key, source);
          invokeCurrent(...args);
        };
      }

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
