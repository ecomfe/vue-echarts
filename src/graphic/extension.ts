import { h, watch } from "vue";

import type { VChartExtensionContext } from "../extensions";
import { registerVChartExtension } from "../extensions";
import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
import { createGraphicCollector } from "./collector";
import { GraphicMount } from "./mount";

const ROOT_ID = "__ve_graphic_root__";

export function registerGraphicExtension(): void {
  registerVChartExtension((ctx: VChartExtensionContext) => {
    const handlersById = new Map<string, Record<string, Array<(...args: unknown[]) => void>>>();
    const boundEvents = new Map<string, (params: unknown) => void>();
    let boundChart: EChartsType | null = null;
    let warnedOptionGraphicOverride = false;

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

    const syncEventBindings = (chart: EChartsType) => {
      const nextEvents = new Set<string>();
      handlersById.forEach((handlers) => {
        Object.keys(handlers).forEach((event) => nextEvents.add(event));
      });

      boundEvents.forEach((handler, event) => {
        if (!nextEvents.has(event)) {
          chart.off(event, handler as any);
          boundEvents.delete(event);
        }
      });

      nextEvents.forEach((event) => {
        if (!boundEvents.has(event)) {
          const handler = (params: unknown) => dispatchEvent(event, params);
          chart.on(event, handler as any);
          boundEvents.set(event, handler);
        }
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
          syncEventBindings(boundChart);
        }
      },
      { immediate: true },
    );

    const collector = createGraphicCollector({
      warn: ctx.warn,
      onFlush: () => {
        const { option, snapshot } = buildGraphicOption(collector.getNodes(), ROOT_ID);
        collector.optionRef.value = option;
        collector.setSnapshot(snapshot);

        handlersById.clear();
        for (const node of collector.getNodes()) {
          const normalized = normalizeHandlers(node.handlers);
          if (Object.keys(normalized).length > 0) {
            handlersById.set(node.id, normalized);
          }
        }
        if (boundChart) {
          syncEventBindings(boundChart);
        }

        const updated = ctx.requestUpdate({
          updateOptions: {
            replaceMerge: ["graphic"],
          },
        });
        if (!updated && ctx.manualUpdate.value) {
          collector.warnOnce(
            "manual-update-graphic",
            "`#graphic` slot updates are ignored when `manual-update` is `true`.",
          );
        }
      },
    });

    return {
      patchOption(option) {
        if (!ctx.slots.graphic) {
          return option;
        }
        if (option.graphic && !warnedOptionGraphicOverride) {
          ctx.warn(
            "`#graphic` slot is provided, so `option.graphic` is ignored. Remove one of them to avoid ambiguity.",
          );
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
  });
}
