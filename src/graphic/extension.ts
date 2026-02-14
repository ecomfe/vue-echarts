import { h, onScopeDispose } from "vue";
import { buildGraphicOption } from "./build";
import { createGraphicCollector } from "./collector";
import { GraphicMount } from "./mount";
import type { GraphicContext } from "./runtime";
import { registerGraphic } from "./runtime";
import { warnManualUpdateIgnored, warnOptionGraphicOverride } from "./warn";

const ROOT_ID = "__ve_graphic_root__";
const GRAPHIC_UPDATE_OPTIONS = { replaceMerge: ["graphic"] };

export function registerGraphicExtension(): void {
  registerGraphic((ctx: GraphicContext) => {
    const { slots, manualUpdate, requestUpdate, warn: warnMessage } = ctx;
    let warnedOverride = false;

    const collector = createGraphicCollector({
      warn: warnMessage,
      onFlush: handleFlush,
    });
    const { dispose, getNodes, warnOnce } = collector;

    function handleFlush(): void {
      const updated = requestUpdate(GRAPHIC_UPDATE_OPTIONS);

      if (!updated && manualUpdate.value) {
        warnOnce("manual-update-graphic", warnManualUpdateIgnored());
      }
    }

    onScopeDispose(dispose);

    return {
      patchOption(option) {
        if (!slots.graphic) {
          return option;
        }
        if (option.graphic && !warnedOverride) {
          warnMessage(warnOptionGraphicOverride());
          warnedOverride = true;
        }
        const nextOption = buildGraphicOption(getNodes(), ROOT_ID);
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
