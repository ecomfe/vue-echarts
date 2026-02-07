import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

import { GraphicMount } from "../src/graphic/mount";

describe("GraphicMount (node)", () => {
  it("returns null without browser root but still drives collector pass", async () => {
    const collector = {
      beginPass: vi.fn(),
      requestFlush: vi.fn(),
      dispose: vi.fn(),
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
    expect(html).toBe("<!---->");
    expect(collector.beginPass).toHaveBeenCalledTimes(1);
    expect(collector.requestFlush).toHaveBeenCalledTimes(0);
  });

  it("ignores non-vnode slot entries when collecting order", async () => {
    const collector = {
      beginPass: vi.fn(),
      requestFlush: vi.fn(),
      dispose: vi.fn(),
    } as any;

    const app = createSSRApp({
      render: () =>
        h(
          GraphicMount as any,
          { collector },
          {
            default: () => [42 as any, "text" as any],
          },
        ),
    });

    const html = await renderToString(app);
    expect(html).toBe("<!---->");
    expect(collector.beginPass).toHaveBeenCalledTimes(1);
    expect(collector.requestFlush).toHaveBeenCalledTimes(0);
  });
});
