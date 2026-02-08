import { h, onScopeDispose, watch } from "vue";

import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
import { createGraphicCollector } from "./collector";
import type { GraphicNode } from "./collector";
import { GraphicMount } from "./mount";
import type { GraphicRuntimeContext } from "./runtime";
import { registerGraphicRuntime } from "./runtime";
import { warnManualUpdateIgnored, warnOptionGraphicOverride } from "./warn";

const ROOT_ID = "__ve_graphic_root__";

type NormalizedHandlers = Record<string, Array<(...args: unknown[]) => void>>;

export function registerGraphicExtension(): void {
  registerGraphicRuntime((ctx: GraphicRuntimeContext) => {
    let handlers = new Map<string, NormalizedHandlers>();
    const eventFns = new Map<string, (params: unknown) => void>();
    let chart: EChartsType | null = null;
    let graphicOption: ReturnType<typeof buildGraphicOption> | null = null;
    let warnedOverride = false;

    const toEventName = (key: string): string | null => {
      if (!key.startsWith("on") || key.length <= 2) {
        return null;
      }
      const raw = key.slice(2);
      return raw.charAt(0).toLowerCase() + raw.slice(1);
    };

    const toHandlers = (input: Record<string, unknown>): NormalizedHandlers => {
      const out: NormalizedHandlers = {};
      for (const [key, value] of Object.entries(input)) {
        const event = toEventName(key);
        if (!event) {
          continue;
        }
        const list: Array<(...args: unknown[]) => void> = Array.isArray(value)
          ? (value as unknown[]).filter(
              (item): item is (...args: unknown[]) => void => typeof item === "function",
            )
          : typeof value === "function"
            ? [value as (...args: unknown[]) => void]
            : [];
        if (list.length > 0) {
          out[event] = list;
        }
      }
      return out;
    };

    const collectHandlers = (nodes: Iterable<GraphicNode>) => {
      const map = new Map<string, NormalizedHandlers>();
      const active = new Set<string>();

      for (const node of nodes) {
        const nodeHandlers = toHandlers(node.handlers);
        const events = Object.keys(nodeHandlers);
        if (events.length === 0) {
          continue;
        }
        map.set(node.id, nodeHandlers);
        events.forEach((event) => active.add(event));
      }

      return { map, active };
    };

    const collectActiveEvents = (source: Map<string, NormalizedHandlers>) => {
      const active = new Set<string>();
      for (const entry of source.values()) {
        Object.keys(entry).forEach((event) => active.add(event));
      }
      return active;
    };

    const unbindAllEvents = (target: EChartsType | null) => {
      if (!target || eventFns.size === 0) {
        return;
      }
      eventFns.forEach((fn, event) => target.off(event, fn as any));
      eventFns.clear();
    };

    const emit = (event: string, params: any) => {
      const id = params?.info?.__veGraphicId;
      if (!id) {
        return;
      }
      const list = handlers.get(String(id))?.[event];
      if (!list) {
        return;
      }
      list.forEach((fn) => fn(params));
    };

    const syncEvents = (chartInst: EChartsType, active: Set<string>) => {
      eventFns.forEach((fn, event) => {
        if (!active.has(event)) {
          chartInst.off(event, fn as any);
          eventFns.delete(event);
        }
      });

      active.forEach((event) => {
        if (eventFns.has(event)) {
          return;
        }
        const fn = (params: unknown) => emit(event, params);
        chartInst.on(event, fn as any);
        eventFns.set(event, fn);
      });
    };

    watch(
      () => ctx.chart.value,
      (next, prev) => {
        unbindAllEvents(prev ?? null);
        chart = next ?? null;
        if (chart) {
          syncEvents(chart, collectActiveEvents(handlers));
        }
      },
      { immediate: true },
    );

    const collector = createGraphicCollector({
      warn: ctx.warn,
      onFlush: () => {
        const nodes = Array.from(collector.getNodes());
        const { map, active } = collectHandlers(nodes);
        handlers = map;

        if (chart) {
          syncEvents(chart, active);
        }

        graphicOption = buildGraphicOption(nodes, ROOT_ID);

        const updated = ctx.requestUpdate({
          updateOptions: {
            replaceMerge: ["graphic"],
          },
        });

        if (!updated && ctx.manualUpdate.value) {
          collector.warnOnce("manual-update-graphic", warnManualUpdateIgnored());
        }
      },
    });

    onScopeDispose(() => {
      collector.dispose();
      unbindAllEvents(chart);
      handlers = new Map<string, NormalizedHandlers>();
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
