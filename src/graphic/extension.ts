import { h, onScopeDispose, watch } from "vue";

import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
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

function normalizeHandlers(input: Record<string, unknown>): GraphicEventHandlers {
  const handlers: GraphicEventHandlers = {};
  for (const [key, value] of Object.entries(input)) {
    const event = toEventName(key);
    if (!event) {
      continue;
    }

    const list: GraphicEventHandler[] = Array.isArray(value)
      ? (value as unknown[]).filter(
          (item): item is GraphicEventHandler => typeof item === "function",
        )
      : typeof value === "function"
        ? [value as GraphicEventHandler]
        : [];

    if (list.length > 0) {
      handlers[event] = list;
    }
  }
  return handlers;
}

function collectEventState(nodes: GraphicNode[]): {
  handlersById: GraphicHandlersById;
  activeEvents: Set<string>;
} {
  const handlersById: GraphicHandlersById = new Map();
  const activeEvents = new Set<string>();

  for (const node of nodes) {
    const normalized = normalizeHandlers(node.handlers);
    const events = Object.keys(normalized);
    if (events.length === 0) {
      continue;
    }

    handlersById.set(node.id, normalized);
    for (const event of events) {
      activeEvents.add(event);
    }
  }

  return { handlersById, activeEvents };
}

export function registerGraphicExtension(): void {
  registerGraphicComposable((ctx: GraphicComposableContext) => {
    let handlersById: GraphicHandlersById = new Map();
    let activeEvents = new Set<string>();
    const boundEvents = new Map<string, (params: unknown) => void>();
    let chart: EChartsType | null = null;
    let graphicOption: ReturnType<typeof buildGraphicOption> | null = null;
    let warnedOverride = false;

    const unbindEvents = (target: EChartsType | null) => {
      if (!target || boundEvents.size === 0) {
        return;
      }
      for (const [event, fn] of boundEvents) {
        target.off(event, fn as any);
      }
      boundEvents.clear();
    };

    const emit = (event: string, params: unknown) => {
      const id = (params as { info?: { __veGraphicId?: unknown } })?.info?.__veGraphicId;
      if (!id) {
        return;
      }
      const list = handlersById.get(String(id))?.[event];
      if (!list) {
        return;
      }
      for (const fn of list) {
        fn(params);
      }
    };

    const syncEvents = () => {
      if (!chart) {
        return;
      }

      for (const [event, fn] of Array.from(boundEvents.entries())) {
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
    };

    watch(
      () => ctx.chart.value,
      (next, prev) => {
        unbindEvents(prev ?? null);
        chart = next ?? null;
        syncEvents();
      },
      { immediate: true },
    );

    const collector = createGraphicCollector({
      warn: ctx.warn,
      onFlush: () => {
        const nodes = Array.from(collector.getNodes());
        const eventState = collectEventState(nodes);
        handlersById = eventState.handlersById;
        activeEvents = eventState.activeEvents;
        syncEvents();

        graphicOption = buildGraphicOption(nodes, ROOT_ID);

        const updated = ctx.requestUpdate(GRAPHIC_UPDATE_OPTIONS);

        if (!updated && ctx.manualUpdate.value) {
          collector.warnOnce("manual-update-graphic", warnManualUpdateIgnored());
        }
      },
    });

    onScopeDispose(() => {
      collector.dispose();
      unbindEvents(chart);
      handlersById = new Map();
      activeEvents = new Set<string>();
      graphicOption = null;
      chart = null;
    });

    return {
      patchOption(option) {
        if (!ctx.slots.graphic) {
          return option;
        }
        if (option.graphic && !warnedOverride) {
          ctx.warn(warnOptionGraphicOverride());
          warnedOverride = true;
        }
        if (!graphicOption) {
          graphicOption = buildGraphicOption(collector.getNodes(), ROOT_ID);
        }
        return {
          ...option,
          graphic: graphicOption.graphic,
        };
      },
      render() {
        if (!ctx.slots.graphic) {
          return null;
        }
        return h(GraphicMount, { collector }, { default: ctx.slots.graphic });
      },
    };
  });
}
