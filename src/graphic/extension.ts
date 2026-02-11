import { h, onScopeDispose, watch } from "vue";

import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
import { GRAPHIC_INFO_ID_KEY } from "./constants";
import type { GraphicNode } from "./collector";
import { createGraphicCollector } from "./collector";
import { GraphicMount } from "./mount";
import type { GraphicComposableContext } from "./runtime";
import { registerGraphicComposable } from "./runtime";
import { warnManualUpdateIgnored, warnOptionGraphicOverride } from "./warn";

const ROOT_ID = "__ve_graphic_root__";
const GRAPHIC_UPDATE_OPTIONS = { replaceMerge: ["graphic"] };

type GraphicEventHandler = (...args: unknown[]) => void;
type GraphicEventHandlers = Record<string, GraphicEventHandler[]>;
type GraphicHandlersById = Map<string, GraphicEventHandlers>;

function toEventName(key: string): string | null {
  if (!key.startsWith("on") || key.length <= 2) {
    return null;
  }
  const raw = key.slice(2);
  return raw.charAt(0).toLowerCase() + raw.slice(1);
}

function collectEventState(nodes: Iterable<GraphicNode>): GraphicHandlersById {
  const handlersById: GraphicHandlersById = new Map();

  for (const node of nodes) {
    let nodeHandlers: GraphicEventHandlers | null = null;

    for (const [key, value] of Object.entries(node.handlers)) {
      const event = toEventName(key);
      if (!event) {
        continue;
      }

      const list: GraphicEventHandler[] = [];
      if (typeof value === "function") {
        list.push(value as GraphicEventHandler);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "function") {
            list.push(item as GraphicEventHandler);
          }
        }
      }
      if (list.length === 0) {
        continue;
      }

      nodeHandlers ||= {};
      nodeHandlers[event] = list;
    }

    if (nodeHandlers) {
      handlersById.set(node.id, nodeHandlers);
    }
  }

  return handlersById;
}

export function registerGraphicExtension(): void {
  registerGraphicComposable((ctx: GraphicComposableContext) => {
    const { chart: chartRef, slots, manualUpdate, requestUpdate, warn: warnMessage } = ctx;
    let handlersById: GraphicHandlersById = new Map();
    const boundEvents = new Map<string, (params: unknown) => void>();
    let chart: EChartsType | null = null;
    let warnedOverride = false;

    function unbindEvents(target: EChartsType | null): void {
      if (!target || boundEvents.size === 0) {
        return;
      }
      for (const [event, fn] of boundEvents) {
        target.off(event, fn as any);
      }
      boundEvents.clear();
    }

    function emit(event: string, params: unknown): void {
      const id = (params as { info?: Record<string, unknown> })?.info?.[GRAPHIC_INFO_ID_KEY];
      if (id == null) {
        return;
      }
      const list = handlersById.get(String(id))?.[event];
      if (!list) {
        return;
      }
      for (const fn of list) {
        fn(params);
      }
    }

    function syncEvents(): void {
      if (!chart) {
        return;
      }

      const activeEvents = new Set<string>();
      for (const handlers of handlersById.values()) {
        for (const event in handlers) {
          activeEvents.add(event);
        }
      }

      for (const [event, fn] of boundEvents) {
        if (!activeEvents.has(event)) {
          chart.off(event, fn as any);
          boundEvents.delete(event);
        }
      }

      for (const event of activeEvents) {
        if (boundEvents.has(event)) {
          continue;
        }

        const fn = (params: unknown) => emit(event, params);
        chart.on(event, fn as any);
        boundEvents.set(event, fn);
      }
    }

    watch(
      () => chartRef.value,
      (next, prev) => {
        unbindEvents(prev ?? null);
        chart = next ?? null;
        syncEvents();
      },
      { immediate: true },
    );

    const collector = createGraphicCollector({
      warn: warnMessage,
      onFlush: handleFlush,
    });
    const { dispose, getNodes, warnOnce } = collector;

    function handleFlush(): void {
      handlersById = collectEventState(getNodes());
      syncEvents();

      const updated = requestUpdate(GRAPHIC_UPDATE_OPTIONS);

      if (!updated && manualUpdate.value) {
        warnOnce("manual-update-graphic", warnManualUpdateIgnored());
      }
    }

    onScopeDispose(() => {
      dispose();
      unbindEvents(chart);
      chart = null;
    });

    return {
      patchOption(option) {
        if (!slots.graphic) {
          return option;
        }
        if (option.graphic && !warnedOverride) {
          warnMessage(warnOptionGraphicOverride());
          warnedOverride = true;
        }
        const nextOption = buildGraphicOption(getNodes(), ROOT_ID);
        return {
          ...option,
          graphic: nextOption.graphic,
        };
      },
      render() {
        if (!slots.graphic) {
          return null;
        }
        return h(GraphicMount, { collector }, { default: slots.graphic });
      },
    };
  });
}
