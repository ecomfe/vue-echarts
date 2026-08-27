import { h, onScopeDispose, onUpdated } from "vue";
import { use } from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { buildOption } from "./build";
import { createCollector, type GraphicCollector } from "./collector";
import { GraphicMount } from "./mount";
import { registerRuntime } from "./runtime";

const ROOT_ID = "__ve_graphic_root__";
let registered = false;

export function registerExtension(): void {
  if (registered) {
    return;
  }
  use([GraphicComponent]);
  registered = true;

  registerRuntime((ctx) => {
    const { slots, manualUpdate, requestUpdate } = ctx;
    let collector: GraphicCollector | undefined;
    let hasGraphicSlot = Boolean(slots.graphic);
    let warnedOverride = false;

    function getCollector(): GraphicCollector {
      return (collector ??= createCollector(handleFlush));
    }

    function handleFlush(): void {
      if (manualUpdate.value) {
        collector!.warn(
          "`#graphic` slot updates are ignored when `manual-update` is `true`.",
          "manual-update-graphic",
        );
        return;
      }
      requestUpdate();
    }

    onScopeDispose(() => collector?.dispose());
    onUpdated(() => {
      const nextHasGraphicSlot = Boolean(slots.graphic);
      if (nextHasGraphicSlot === hasGraphicSlot) {
        return;
      }
      hasGraphicSlot = nextHasGraphicSlot;
      if (!hasGraphicSlot) {
        collector?.cancelPendingFlush();
      }
      handleFlush();
    });

    return {
      patchOption(option) {
        hasGraphicSlot = Boolean(slots.graphic);
        if (!hasGraphicSlot) {
          return option;
        }
        const collector = getCollector();
        if (option.graphic && !warnedOverride) {
          collector.warn(
            "`#graphic` slot is provided, so `option.graphic` is ignored. Remove one of them to avoid ambiguity.",
          );
          warnedOverride = true;
        }
        const nextOption = buildOption(collector.getNodes(), ROOT_ID);
        collector.cancelPendingFlush();
        return {
          ...option,
          graphic: nextOption.graphic,
        };
      },
      render() {
        if (!slots.graphic) {
          return null;
        }
        return h(GraphicMount, { collector: getCollector() }, { default: slots.graphic });
      },
    };
  });
}
