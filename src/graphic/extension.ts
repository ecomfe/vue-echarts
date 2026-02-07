import { h, onScopeDispose, watch } from "vue";

import type { VChartExtensionContext } from "../extensions";
import { registerVChartExtension } from "../extensions";
import type { EChartsType } from "../types";
import { buildGraphicOption } from "./build";
import { createGraphicCollector, createStableSerializer } from "./collector";
import { GraphicMount } from "./mount";
import { warnManualUpdateIgnored, warnOptionGraphicOverride } from "./warn";

const ROOT_ID = "__ve_graphic_root__";
const GRAPHIC_EXTENSION_KEY = "vue-echarts/graphic";

type NormalizedHandlers = Record<string, Array<(...args: unknown[]) => void>>;

const stringifyOption = createStableSerializer();
function optionSignature(option: unknown): string {
  return stringifyOption(option);
}

function isSameHandlers(a: NormalizedHandlers | undefined, b: NormalizedHandlers): boolean {
  if (!a) {
    return Object.keys(b).length === 0;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (!(key in b)) {
      return false;
    }
    const listA = a[key];
    const listB = b[key];
    if (listA.length !== listB.length) {
      return false;
    }
    for (let i = 0; i < listA.length; i++) {
      if (listA[i] !== listB[i]) {
        return false;
      }
    }
  }

  return true;
}

export function registerGraphicExtension(): void {
  registerVChartExtension(
    (ctx: VChartExtensionContext) => {
      const handlersById = new Map<string, NormalizedHandlers>();
      const eventRefCount = new Map<string, number>();
      const boundEvents = new Map<string, (params: unknown) => void>();
      let boundChart: EChartsType | null = null;
      let warnedOptionGraphicOverride = false;
      let lastGraphicOptionSignature = "";
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

      const incrementEventRefs = (handlers: NormalizedHandlers, delta: 1 | -1) => {
        Object.keys(handlers).forEach((event) => {
          const next = (eventRefCount.get(event) ?? 0) + delta;
          if (next <= 0) {
            eventRefCount.delete(event);
          } else {
            eventRefCount.set(event, next);
          }
        });
      };

      const setNodeHandlers = (id: string, next: NormalizedHandlers) => {
        const prev = handlersById.get(id);
        if (isSameHandlers(prev, next)) {
          return;
        }

        if (prev) {
          incrementEventRefs(prev, -1);
        }

        if (Object.keys(next).length > 0) {
          handlersById.set(id, next);
          incrementEventRefs(next, 1);
        } else {
          handlersById.delete(id);
        }
      };

      const removeNodeHandlers = (id: string) => {
        const prev = handlersById.get(id);
        if (prev) {
          incrementEventRefs(prev, -1);
        }
        handlersById.delete(id);
      };

      const syncEventBindings = (chart: EChartsType) => {
        boundEvents.forEach((handler, event) => {
          if (!eventRefCount.has(event)) {
            chart.off(event, handler as any);
            boundEvents.delete(event);
          }
        });

        eventRefCount.forEach((count, event) => {
          if (count <= 0 || boundEvents.has(event)) {
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
            syncEventBindings(boundChart);
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
          const seenIds = new Set<string>();
          for (const node of nodes) {
            seenIds.add(node.id);
            setNodeHandlers(node.id, normalizeHandlers(node.handlers));
          }
          Array.from(handlersById.keys()).forEach((id) => {
            if (!seenIds.has(id)) {
              removeNodeHandlers(id);
            }
          });

          if (boundChart) {
            syncEventBindings(boundChart);
          }

          const { option, snapshot } = buildGraphicOption(nodes, ROOT_ID);
          const signature = optionSignature(option.graphic);
          const graphicChanged = signature !== lastGraphicOptionSignature;

          collector.optionRef.value = option;
          collector.setSnapshot(snapshot);
          lastGraphicOptionSignature = signature;

          if (!graphicChanged) {
            if (ctx.manualUpdate.value) {
              collector.warnOnce("manual-update-graphic", warnManualUpdateIgnored());
            }
            return;
          }

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
        eventRefCount.clear();
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
            lastGraphicOptionSignature = optionSignature(initialOption.graphic);
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
