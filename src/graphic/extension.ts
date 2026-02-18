import { h, onScopeDispose } from "vue";
import { use } from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { buildOption } from "./build";
import { createCollector } from "./collector";
import { GraphicMount } from "./mount";
import type { GraphicContext } from "./runtime";
import { registerRuntime } from "./runtime";

const ROOT_ID = "__ve_graphic_root__";
const UPDATE_OPTIONS = { replaceMerge: ["graphic"] };
let componentRegistered = false;

export function registerExtension(): void {
  if (!componentRegistered) {
    use([GraphicComponent]);
    componentRegistered = true;
  }

  registerRuntime((ctx: GraphicContext) => {
    const { slots, manualUpdate, requestUpdate } = ctx;
    let warnedOverride = false;

    const collector = createCollector({
      onFlush: handleFlush,
    });
    const { dispose, getNodes, warn } = collector;

    function handleFlush(): void {
      const updated = requestUpdate(UPDATE_OPTIONS);

      if (!updated && manualUpdate.value) {
        warn("`#graphic` slot updates are ignored when `manual-update` is `true`.", {
          onceKey: "manual-update-graphic",
        });
      }
    }

    onScopeDispose(dispose);

    return {
      patchOption(option) {
        if (!slots.graphic) {
          return option;
        }
        if (option.graphic && !warnedOverride) {
          warn(
            "`#graphic` slot is provided, so `option.graphic` is ignored. Remove one of them to avoid ambiguity.",
          );
          warnedOverride = true;
        }
        const nextOption = buildOption(getNodes(), ROOT_ID);
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
