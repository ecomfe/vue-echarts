import { h, onScopeDispose, watch } from "vue";

import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
import { createGraphicCollector } from "./collector";
import { GraphicMount } from "./mount";
import type { GraphicRuntimeContext } from "./runtime";
import { registerGraphicRuntime } from "./runtime";
import { warnManualUpdateIgnored, warnOptionGraphicOverride } from "./warn";

const ROOT_ID = "__ve_graphic_root__";

type NormalizedHandlers = Record<string, Array<(...args: unknown[]) => void>>;

export function registerGraphicExtension(): void {
  registerGraphicRuntime((ctx: GraphicRuntimeContext) => {
    const handlers = new Map<string, NormalizedHandlers>();
    const eventFns = new Map<string, (params: unknown) => void>();
    let chart: EChartsType | null = null;
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
        if (prev && eventFns.size > 0) {
          eventFns.forEach((fn, event) => prev.off(event, fn as any));
          eventFns.clear();
        }
        chart = next ?? null;
        if (chart) {
          const active = new Set<string>();
          handlers.forEach((entry) => {
            Object.keys(entry).forEach((event) => active.add(event));
          });
          syncEvents(chart, active);
        }
      },
      { immediate: true },
    );

    const collector = createGraphicCollector({
      warn: ctx.warn,
      onFlush: () => {
        const nodes = Array.from(collector.getNodes());
        const next = new Map<string, NormalizedHandlers>();
        const active = new Set<string>();

        for (const node of nodes) {
          const nodeHandlers = toHandlers(node.handlers);
          if (Object.keys(nodeHandlers).length > 0) {
            next.set(node.id, nodeHandlers);
            Object.keys(nodeHandlers).forEach((event) => active.add(event));
          }
        }

        handlers.clear();
        next.forEach((entry, id) => {
          handlers.set(id, entry);
        });

        if (chart) {
          syncEvents(chart, active);
        }

        collector.optionRef.value = buildGraphicOption(nodes, ROOT_ID);

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
      if (chart && eventFns.size > 0) {
        eventFns.forEach((fn, event) => chart?.off(event, fn as any));
      }
      eventFns.clear();
      handlers.clear();
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
        if (!collector.optionRef.value) {
          collector.optionRef.value = buildGraphicOption(collector.getNodes(), ROOT_ID);
        }
        const graphicOption = collector.optionRef.value!;
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
