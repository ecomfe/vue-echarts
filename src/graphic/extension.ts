import { h, onScopeDispose, onUpdated } from "vue";
import { use } from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { buildOption, type GraphicElement } from "./build";
import { planUpdate, type Signature } from "../update";
import { createCollector } from "./collector";
import { GraphicMount } from "./mount";
import { registerRuntime } from "./runtime";

const ROOT_ID = "__ve_graphic_root__";

export function registerExtension(): void {
  use([GraphicComponent]);

  registerRuntime((ctx) => {
    const { slots, manualUpdate, requestUpdate } = ctx;
    const collector = createCollector(handleFlush);
    let hasGraphicSlot = Boolean(slots.graphic);
    let signature: Signature | undefined;
    let versions = new Map<string, number | undefined>();

    function handleFlush(): void {
      if (manualUpdate.value) {
        const nodes = Array.from(collector.getNodes());
        const changed =
          !slots.graphic ||
          nodes.length !== versions.size ||
          nodes.some((node) => versions.get(node.id) !== node.version);
        if (!signature || !changed) {
          return;
        }
        collector.warn(
          "`#graphic` slot updates are ignored when `manual-update` is `true`.",
          "manual-update-graphic",
        );
        return;
      }
      requestUpdate();
    }

    onScopeDispose(collector.dispose);
    onUpdated(() => {
      const nextHasGraphicSlot = Boolean(slots.graphic);
      if (nextHasGraphicSlot === hasGraphicSlot) {
        return;
      }
      hasGraphicSlot = nextHasGraphicSlot;
      if (!hasGraphicSlot) {
        collector.cancelPendingFlush();
      }
      handleFlush();
    });

    return {
      cancelPendingFlush: collector.cancelPendingFlush,
      prepare(option, reset) {
        hasGraphicSlot = Boolean(slots.graphic);
        collector.cancelPendingFlush();
        if (!hasGraphicSlot) {
          return {
            option,
            replace: false,
            commit: () => {
              signature = undefined;
              versions.clear();
            },
          };
        }
        if (option.graphic) {
          collector.warn(
            "`#graphic` slot is provided, so `option.graphic` is ignored. Remove one of them to avoid ambiguity.",
            "option-graphic-override",
          );
        }
        const nodes = Array.from(collector.getNodes());
        const nextOption = buildOption(nodes, ROOT_ID);
        const planned = planUpdate(signature, nextOption);
        const replace =
          reset ||
          !signature ||
          planned.plan.notMerge ||
          Boolean(planned.plan.replaceMerge?.length);
        const nextVersions = new Map(nodes.map((node) => [node.id, node.version]));
        const elements: GraphicElement[] = [];
        function collectChanges(element: GraphicElement, parentId?: string): void {
          const { children, ...props } = element;
          if (
            nextVersions.has(element.id) &&
            nextVersions.get(element.id) !== versions.get(element.id)
          ) {
            elements.push({ ...props, parentId });
          }
          children?.forEach((child) => collectChanges(child, element.id));
        }
        if (!replace) {
          nextOption.graphic.elements.forEach((element) => collectChanges(element));
        }
        const patched = { ...option };
        delete patched.graphic;
        if (replace || elements.length) {
          patched.graphic = replace ? nextOption.graphic : { elements };
        }
        return {
          option: patched,
          replace,
          commit: () => {
            signature = planned.signature;
            versions = nextVersions;
          },
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
