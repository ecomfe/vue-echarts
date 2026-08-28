import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

import { GraphicMount } from "../src/graphic/mount";

describe("GraphicMount (node)", () => {
  it("renders empty teleport anchors while still driving the collector pass", async () => {
    const collector = {
      beginPass: vi.fn(),
    } as any;

    const app = createSSRApp({
      render: () =>
        h(
          GraphicMount as any,
          { collector },
          {
            default: () => [h("div", "graphic")],
          },
        ),
    });

    const html = await renderToString(app);
    expect(html).toBe("<!--teleport start--><!--teleport end-->");
    expect(collector.beginPass).toHaveBeenCalledTimes(1);
  });
});
