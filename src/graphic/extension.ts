import { h, onScopeDispose, watch } from "vue";

import type { VChartExtensionContext } from "../extensions";
import { registerVChartExtension } from "../extensions";
import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
import { createGraphicCollector } from "./collector";
import { GraphicMount } from "./mount";
import { warnManualUpdateIgnored, warnOptionGraphicOverride } from "./warn";

const ROOT_ID = "__ve_graphic_root__";
const GRAPHIC_EXTENSION_KEY = "vue-echarts/graphic";

type NormalizedHandlers = Record<string, Array<(...args: unknown[]) => void>>;

export function registerGraphicExtension(): void {
  registerVChartExtension(
    (ctx: VChartExtensionContext) => {
      const handlersById = new Map<string, NormalizedHandlers>();
      const boundEvents = new Map<string, (params: unknown) => void>();
      let boundChart: EChartsType | null = null;
      let warnedOptionGraphicOverride = false;
      let lastHandledStructureVersion = -1;

      const normalizeEvent = (key: string): string | null => {
        if (!key.startsWith("on") || key.length <= 2) {
          return null;
        }
        const raw = key.slice(2);
        return raw.charAt(0).toLowerCase() + raw.slice(1);
      };

      const normalizeHandlers = (
        rawHandlers: Record<string, unknown>,
      ): Record<string, Array<(...args: unknown[]) => void>> => {
        const result: Record<string, Array<(...args: unknown[]) => void>> = {};
        for (const [key, value] of Object.entries(rawHandlers)) {
          const event = normalizeEvent(key);
          if (!event) {
            continue;
          }
          const handlers: Array<(...args: unknown[]) => void> = Array.isArray(value)
            ? (value as unknown[]).filter(
                (item): item is (...args: unknown[]) => void => typeof item === "function",
              )
            : typeof value === "function"
              ? [value as (...args: unknown[]) => void]
              : [];
          if (handlers.length > 0) {
            result[event] = handlers;
          }
        }
        return result;
      };

      const dispatchEvent = (event: string, params: any) => {
        const id = params?.info?.__veGraphicId;
        if (!id) {
          return;
        }
        const handlers = handlersById.get(String(id))?.[event];
        if (!handlers) {
          return;
        }
        handlers.forEach((handler) => handler(params));
      };

      const syncEventBindings = (chart: EChartsType, activeEvents: Set<string>) => {
        boundEvents.forEach((handler, event) => {
          if (!activeEvents.has(event)) {
            chart.off(event, handler as any);
            boundEvents.delete(event);
          }
        });

        activeEvents.forEach((event) => {
          if (boundEvents.has(event)) {
            return;
          }
          const handler = (params: unknown) => dispatchEvent(event, params);
          chart.on(event, handler as any);
          boundEvents.set(event, handler);
        });
      };

      watch(
        () => ctx.chart.value,
        (chart, prev) => {
          if (prev && boundEvents.size > 0) {
            boundEvents.forEach((handler, event) => prev.off(event, handler as any));
            boundEvents.clear();
          }
          boundChart = chart ?? null;
          if (boundChart) {
            const activeEvents = new Set<string>();
            handlersById.forEach((handlers) => {
              Object.keys(handlers).forEach((event) => activeEvents.add(event));
            });
            syncEventBindings(boundChart, activeEvents);
          }
        },
        { immediate: true },
      );

      const collector = createGraphicCollector({
        warn: ctx.warn,
        onFlush: () => {
          const structureVersion = collector.getStructureVersion();
          if (structureVersion === lastHandledStructureVersion) {
            return;
          }
          lastHandledStructureVersion = structureVersion;

          const nodes = Array.from(collector.getNodes());
          const nextHandlersById = new Map<string, NormalizedHandlers>();
          const activeEvents = new Set<string>();

          for (const node of nodes) {
            const handlers = normalizeHandlers(node.handlers);
            if (Object.keys(handlers).length > 0) {
              nextHandlersById.set(node.id, handlers);
              Object.keys(handlers).forEach((event) => activeEvents.add(event));
            }
          }

          handlersById.clear();
          nextHandlersById.forEach((handlers, id) => {
            handlersById.set(id, handlers);
          });

          if (boundChart) {
            syncEventBindings(boundChart, activeEvents);
          }

          const { option, snapshot } = buildGraphicOption(nodes, ROOT_ID);

          collector.optionRef.value = option;
          collector.setSnapshot(snapshot);

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
        if (boundChart && boundEvents.size > 0) {
          boundEvents.forEach((handler, event) => boundChart?.off(event, handler as any));
        }
        boundEvents.clear();
        handlersById.clear();
        boundChart = null;
      });

      return {
        patchOption(option) {
          if (!ctx.slots.graphic) {
            return option;
          }
          if (option.graphic && !warnedOptionGraphicOverride) {
            ctx.warn(warnOptionGraphicOverride());
            warnedOptionGraphicOverride = true;
          }
          if (!collector.optionRef.value) {
            const { option: initialOption, snapshot } = buildGraphicOption(
              collector.getNodes(),
              ROOT_ID,
            );
            collector.optionRef.value = initialOption;
            collector.setSnapshot(snapshot);
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
    },
    { key: GRAPHIC_EXTENSION_KEY },
  );
}
