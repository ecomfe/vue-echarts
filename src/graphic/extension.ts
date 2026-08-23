import { h, onScopeDispose } from "vue";
import { use } from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { buildOption } from "./build";
import { createCollector, type GraphicCollector } from "./collector";
import { GraphicMount } from "./mount";
import { registerRuntime } from "./runtime";

const ROOT_ID = "__ve_graphic_root__";
const UPDATE_OPTIONS = { replaceMerge: ["graphic"] };
let componentRegistered = false;

export function registerExtension(): void {
  if (!componentRegistered) {
    use([GraphicComponent]);
    componentRegistered = true;
  }

  registerRuntime((ctx) => {
    const { slots, manualUpdate, requestUpdate } = ctx;
    let collector: GraphicCollector | undefined;
    let warnedOverride = false;

    function getCollector(): GraphicCollector {
      return (collector ??= createCollector({ onFlush: handleFlush }));
    }

    function handleFlush(): void {
      const updated = requestUpdate(UPDATE_OPTIONS);

      if (!updated && manualUpdate.value) {
        collector!.warn(
          "`#graphic` slot updates are ignored when `manual-update` is `true`.",
          "manual-update-graphic",
        );
      }
    }

    onScopeDispose(() => collector?.dispose());

    return {
      patchOption(option) {
        if (!slots.graphic) {
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
