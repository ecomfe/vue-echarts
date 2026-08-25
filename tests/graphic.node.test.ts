import { describe, it, expect, vi } from "vitest";
import { init } from "echarts";

import { buildOption } from "../src/graphic/build";
import { createCollector, type GraphicNode } from "../src/graphic/collector";
import * as components from "../src/graphic/components";
import { GRAPHIC_COMPONENT_MARKER } from "../src/graphic/marker";

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

function getRootGraphicElement(option: unknown): any {
  const root = (option as any).graphic?.elements?.[0] as any;
  if (!root) {
    throw new Error("Expected root graphic element to exist.");
  }
  return root;
}

function createChart() {
  return init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 100,
    height: 100,
  });
}

describe("graphic", () => {
  it("exports only element types supported by the ECharts graphic component", () => {
    const nodes = Object.values(components).map((component, index): GraphicNode => ({
      id: String(index),
      type: (component as unknown as Record<symbol, string>)[GRAPHIC_COMPONENT_MARKER],
      parentId: null,
      props: {},
      handlers: {},
      order: index,
      sourceId: index,
    }));
    const chart = createChart();

    try {
      expect(() => chart.setOption(buildOption(nodes, "root"))).not.toThrow();
    } finally {
      chart.dispose();
    }
  });

  it("builds graphic option with ordered children and replace root", () => {
    const during = vi.fn();
    const extra = { progress: 0 };
    const typography = {
      textFont: "italic 20px serif",
      fontStyle: "italic",
      fontWeight: 600,
      fontFamily: "sans-serif",
      fontSize: "14px",
      align: "center",
      verticalAlign: "middle",
      lineHeight: 20,
      backgroundColor: "#fff",
      padding: [2, 4],
      margin: 3,
      borderColor: "#333",
      borderWidth: 1,
      borderRadius: [2, 4],
      borderDash: false,
      borderDashOffset: 2,
      rich: { accent: { fill: "#f00", fontWeight: "bold" } },
      lineOverflow: "truncate",
    };
    const paint = {
      fill: "#f00",
      decal: { image: "pattern.png", repeat: "repeat" },
      strokePercent: 0,
      strokeNoScale: false,
      strokeFirst: false,
      fillOpacity: 0.5,
      strokeOpacity: 0.75,
    };
    const nodes: GraphicNode[] = [
      {
        id: "rect",
        type: "rect",
        parentId: null,
        props: {
          name: "main-rect",
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          extra,
          during,
          tooltip: { show: true, formatter: "main-rect" },
          clipPath: { type: "circle", shape: { cx: 15, cy: 20, r: 10 } },
          textContent: { type: "text", style: { text: "label" } },
          textConfig: { position: "inside" },
          autoBatch: true,
          style: { fill: "#000", stroke: "#0f0" },
          ...paint,
        },
        handlers: {},
        order: 1,
        sourceId: 1,
      },
      {
        id: "text",
        type: "text",
        parentId: null,
        props: {
          x: 2,
          y: 4,
          width: 120,
          height: 40,
          overflow: "truncate",
          ellipsis: "...",
          placeholder: "…",
          truncateMinChar: 2,
          text: "Hi",
          ...typography,
          fill: "#123",
          decal: paint.decal,
          strokePercent: 0.25,
          textFill: "#000",
        },
        handlers: {},
        order: 0,
        sourceId: 2,
      },
      {
        id: "ellipse",
        type: "ellipse",
        parentId: null,
        props: { cx: 20, cy: 30, rx: 12, ry: 8 },
        handlers: {},
        order: 2,
        sourceId: 3,
      },
    ];

    const option = buildOption(nodes, "root");
    const root = getRootGraphicElement(option);

    expect(root.id).toBe("root");
    expect(root.$action).toBe("replace");

    const [text, rect, ellipse] = root.children as any[];

    expect(text.type).toBe("text");
    expect(text.x).toBe(2);
    expect(text.y).toBe(4);
    expect(text.style).toMatchObject({
      text: "Hi",
      ...typography,
      fill: "#123",
      textFill: "#000",
      width: 120,
      height: 40,
      overflow: "truncate",
      ellipsis: "...",
      placeholder: "…",
      truncateMinChar: 2,
    });
    expect(text.width).toBeUndefined();
    expect(text.height).toBeUndefined();
    expect(text.style.decal).toBeUndefined();
    expect(text.style.strokePercent).toBeUndefined();

    expect(rect.type).toBe("rect");
    expect(rect.name).toBe("main-rect");
    expect(rect.autoBatch).toBe(true);
    expect(rect.extra).toBe(extra);
    expect(rect.during).toBe(during);
    expect(rect.tooltip).toEqual({ show: true, formatter: "main-rect" });
    expect(rect.clipPath).toEqual({ type: "circle", shape: { cx: 15, cy: 20, r: 10 } });
    expect(rect.textContent).toMatchObject({ type: "text" });
    expect(rect.textConfig).toMatchObject({ position: "inside" });
    expect(rect.shape).toMatchObject({ x: 10, y: 20, width: 30, height: 40 });
    expect(rect.style).toMatchObject({ ...paint, stroke: "#0f0" });

    expect(ellipse.shape).toEqual({ cx: 20, cy: 30, rx: 12, ry: 8 });

    expect(root.children.some((child: any) => child.id === "rect")).toBe(true);
  });

  it("builds an empty replace root when there are no nodes", () => {
    const root = getRootGraphicElement(buildOption([], "root"));

    expect(root.children).toEqual([]);
  });

  it("keeps the internal root id distinct from user element ids", () => {
    const nodes = ["root_", "root"].map((id, index): GraphicNode => ({
      id,
      type: "rect",
      parentId: null,
      props: { x: index, y: 0, width: 1, height: 1 },
      handlers: {},
      order: index,
      sourceId: index,
    }));
    const option = buildOption(nodes, "root");
    const root = getRootGraphicElement(option);
    const chart = createChart();

    try {
      expect(root.id).toBe("root__");
      expect(root.children.map((child: { id: string }) => child.id)).toEqual(["root_", "root"]);
      expect(() => chart.setOption(option)).not.toThrow();
    } finally {
      chart.dispose();
    }
  });

  it("routes shared props only to compatible element types", () => {
    const common = {
      parentId: null,
      handlers: {},
      order: 0,
      sourceId: 1,
    };
    const root = getRootGraphicElement(
      buildOption(
        [
          {
            ...common,
            id: "polyline",
            type: "polyline",
            props: { percent: 0.5, blend: "multiply" },
          },
          { ...common, id: "arc", type: "arc", props: { r0: 5 } },
          { ...common, id: "circle", type: "circle", props: { width: 10, height: 20 } },
          {
            ...common,
            id: "group",
            type: "group",
            props: {
              z: 1,
              z2: 2,
              zlevel: 3,
              cursor: "pointer",
              invisible: true,
              ignore: true,
            },
          },
          {
            ...common,
            id: "text",
            type: "text",
            props: {
              shape: { x: 1 },
              blend: "screen",
              textContent: { type: "text", style: { text: "nested" } },
              textConfig: { position: "inside" },
            },
          },
          { ...common, id: "image", type: "image", props: { shapeTransition: "all" } },
        ],
        "root",
      ),
    );

    expect(root.children).toEqual([
      {
        type: "polyline",
        id: "polyline",
        shape: { percent: 0.5 },
        style: { blend: "multiply" },
      },
      { type: "arc", id: "arc" },
      { type: "circle", id: "circle" },
      { type: "group", id: "group", ignore: true },
      { type: "text", id: "text" },
      { type: "image", id: "image" },
    ]);
  });

  it("keeps user info, ignores inherited handlers, and uses the latest handler array", () => {
    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const inheritedMouseover = vi.fn();
    const handlers = [onClickA];
    const nodes: GraphicNode[] = [
      {
        id: "hit",
        type: "circle",
        parentId: null,
        props: {
          cx: 1,
          cy: 2,
          r: 3,
          info: { name: "marker" },
        },
        handlers: Object.assign(Object.create({ onMouseover: inheritedMouseover }), {
          onClick: handlers,
        }),
        order: 0,
        sourceId: 1,
      },
    ];
    nodes[0].handlerCache = new Map([
      ["onMouseover", { source: inheritedMouseover, handler: inheritedMouseover }],
    ]);

    const option = buildOption(nodes, "root");
    const root = getRootGraphicElement(option);
    const child = root.children?.[0] as Record<string, unknown> | undefined;
    if (!child) {
      throw new Error("Expected child graphic element to exist.");
    }
    const info = child.info as Record<string, unknown>;
    const click = child.onclick;
    if (typeof click !== "function") {
      throw new Error("Expected click handler to exist.");
    }

    expect(info).toMatchObject({ name: "marker" });
    expect(child.onmouseover).toBeUndefined();
    expect(nodes[0].handlerCache.has("onMouseover")).toBe(false);
    click("first");
    handlers[0] = onClickB;
    click("second");
    expect(onClickA).toHaveBeenCalledWith("first");
    expect(onClickA).toHaveBeenCalledTimes(1);
    expect(onClickB).toHaveBeenCalledWith("second");

    const rebuilt = getRootGraphicElement(buildOption(nodes, "root")).children?.[0];
    expect(rebuilt?.onclick).toBe(click);

    nodes[0].handlers = {};
    buildOption(nodes, "root");
    expect(nodes[0].handlerCache).toBeUndefined();
  });

  it.each(["onClick", "onClickOnce"])(
    "drops and recreates %s when its array is emptied in place",
    (key) => {
      const handler = vi.fn();
      const handlers: unknown[] = [handler];
      const node: GraphicNode = {
        id: "mutable-handler",
        type: "circle",
        parentId: null,
        props: {},
        handlers: { [key]: handlers },
        order: 0,
        sourceId: 1,
      };
      const getClick = () =>
        getRootGraphicElement(buildOption([node], "root")).children?.[0]?.onclick;

      expect(getClick()).toBeTypeOf("function");

      handlers.length = 0;
      expect(getClick()).toBeUndefined();

      handlers.push(handler);
      const rebound = getClick();
      if (typeof rebound !== "function") {
        throw new Error("Expected click handler to be recreated.");
      }
      rebound("payload");
      rebound("again");

      expect(handler).toHaveBeenCalledTimes(key === "onClickOnce" ? 1 : 2);
    },
  );

  it("builds image and group options", () => {
    const crop = {
      sx: 1,
      sy: 2,
      sWidth: 30,
      sHeight: 40,
    };
    const nodes: GraphicNode[] = [
      {
        id: "group",
        type: "group",
        parentId: null,
        props: {
          info: "root",
          width: 80,
          height: 40,
        },
        handlers: {},
        order: 0,
        sourceId: 1,
      },
      {
        id: "img",
        type: "image",
        parentId: "group",
        props: {
          x: 1,
          y: 2,
          width: 3,
          height: 4,
          image: "https://example.com/a.png",
          autoBatch: true,
          fill: "#f00",
          lineWidth: 2,
          opacity: 0.5,
          ...crop,
          styleTransition: "all",
        },
        handlers: {},
        order: 0,
        sourceId: 2,
      },
      {
        id: "img-hit",
        type: "image",
        parentId: "group",
        props: {
          image: "https://example.com/b.png",
        },
        handlers: { onClick: () => void 0 },
        order: 2,
        sourceId: 7,
      },
      {
        id: "line",
        type: "line",
        parentId: "group",
        props: {
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 10,
          shapeTransition: "shape",
          info: 42,
        },
        handlers: {},
        order: 1,
        sourceId: 3,
      },
      {
        id: "custom",
        type: "custom",
        parentId: null,
        props: { info: { level: "custom" } },
        handlers: {},
        order: 1,
        sourceId: 4,
      },
      {
        id: "txt",
        type: "text",
        parentId: null,
        props: {
          text: "hello",
        },
        handlers: { onMouseover: () => void 0 },
        order: 4,
        sourceId: 8,
      },
      {
        id: "dup",
        type: "rect",
        parentId: null,
        props: {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
        handlers: {},
        order: 2,
        sourceId: 5,
      },
      {
        id: "dup",
        type: "rect",
        parentId: null,
        props: {
          x: 2,
          y: 2,
          width: 1,
          height: 1,
        },
        handlers: {},
        order: 3,
        sourceId: 6,
      },
    ];

    const option = buildOption(nodes, "root");
    const root = getRootGraphicElement(option);
    const group = root.children.find((item: any) => item.id === "group");
    if (!group) {
      throw new Error("Expected group node to exist.");
    }
    const image = group.children.find((item: any) => item.id === "img");
    const line = group.children.find((item: any) => item.id === "line");
    const imageHit = group.children.find((item: any) => item.id === "img-hit");
    const custom = root.children.find((item: any) => item.id === "custom");
    const text = root.children.find((item: any) => item.id === "txt");

    expect(group.info).toBe("root");
    expect(group).toMatchObject({ width: 80, height: 40 });
    expect(image.style).toMatchObject({
      image: "https://example.com/a.png",
      opacity: 0.5,
      ...crop,
      transition: "all",
    });
    expect(image.autoBatch).toBeUndefined();
    expect(image.style.fill).toBeUndefined();
    expect(image.style.lineWidth).toBeUndefined();
    expect(line.shape).toMatchObject({
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      transition: "shape",
    });
    expect(line.info).toBe(42);
    expect(imageHit.info).toBeUndefined();
    expect(custom.info).toMatchObject({ level: "custom" });
    expect(text.info).toBeUndefined();
    expect(typeof imageHit.onclick).toBe("function");
    expect(typeof text.onmouseover).toBe("function");
    expect(custom.shape).toBeUndefined();

    expect(root.children.filter((item: any) => item.id === "dup")).toHaveLength(2);
  });

  it("coalesces flushes and warns on duplicate ids", async () => {
    const onFlush = vi.fn();
    const collector = createCollector(onFlush);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      collector.register({
        id: "dup",
        type: "rect",
        parentId: null,
        props: {},
        handlers: {},
        sourceId: 1,
      });
      collector.register({
        id: "dup",
        type: "rect",
        parentId: null,
        props: {},
        handlers: {},
        sourceId: 2,
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(onFlush).toHaveBeenCalledTimes(0);

      await flushMicrotasks();

      expect(onFlush).toHaveBeenCalledTimes(1);

      collector.unregister("dup");
      await flushMicrotasks();

      expect(onFlush).toHaveBeenCalledTimes(2);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("forwards collector.warn without options", () => {
    const collector = createCollector(() => void 0);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      collector.warn("plain warning");

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toContain("plain warning");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("exposes current collector nodes", () => {
    const collector = createCollector(() => void 0);

    collector.register({
      id: "a",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 1,
    });
    collector.register({
      id: "b",
      type: "text",
      parentId: "a",
      props: {},
      handlers: {},
      sourceId: 2,
    });

    const nodes = Array.from(collector.getNodes());
    expect(nodes.some((item) => item.id === "a")).toBe(true);
    expect(nodes.find((item) => item.id === "b")?.parentId).toBe("a");
  });

  it("ignores unregister from mismatched source and removes with matched source", () => {
    const collector = createCollector(() => void 0);

    collector.register({
      id: "x",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 1,
    });

    collector.unregister("x", 2);
    expect(Array.from(collector.getNodes()).some((item) => item.id === "x")).toBe(true);
    collector.unregister("missing", 1);
    expect(Array.from(collector.getNodes()).some((item) => item.id === "x")).toBe(true);

    collector.unregister("x", 1);
    expect(Array.from(collector.getNodes()).some((item) => item.id === "x")).toBe(false);
  });

  it("does not mark duplicate when same id appears across flushed updates", async () => {
    const collector = createCollector(() => void 0);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      collector.register({
        id: "node",
        type: "rect",
        parentId: null,
        props: {},
        handlers: {},
        sourceId: 1,
      });
      await flushMicrotasks();

      collector.register({
        id: "node",
        type: "rect",
        parentId: null,
        props: {},
        handlers: {},
        sourceId: 2,
      });

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("skips pending flush callback and ignores operations after dispose", async () => {
    const onFlush = vi.fn();
    const collector = createCollector(onFlush);

    collector.register({
      id: "node",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 1,
    });

    collector.dispose();
    await flushMicrotasks();

    expect(onFlush).toHaveBeenCalledTimes(0);

    collector.register({
      id: "after-dispose",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 2,
    });
    collector.unregister("node");
    await flushMicrotasks();

    expect(Array.from(collector.getNodes())).toEqual([]);
  });

  it("accepts null, bigint, and symbol values", async () => {
    const onFlush = vi.fn();
    const collector = createCollector(onFlush);
    const onClick = () => void 0;
    const marker = Symbol("marker");

    collector.register({
      id: "typed-node",
      type: "rect",
      parentId: null,
      props: {
        nullable: null,
        amount: 10n,
        marker,
        enabled: true,
        archived: false,
        nested: {
          a: null,
          b: 20n,
          c: marker,
        },
        list: [null, 30n, marker],
      },
      handlers: {
        onClick,
      },
      order: 0,
      sourceId: 1,
    });

    await flushMicrotasks();
    expect(onFlush).toHaveBeenCalledTimes(1);

    collector.register({
      id: "typed-node",
      type: "rect",
      parentId: null,
      props: {
        nullable: null,
        amount: 10n,
        marker,
        enabled: true,
        archived: false,
        nested: {
          a: null,
          b: 20n,
          c: marker,
        },
        list: [null, 30n, marker],
      },
      handlers: {
        onClick,
      },
      order: 0,
      sourceId: 1,
    });

    await flushMicrotasks();
    expect(onFlush).toHaveBeenCalledTimes(2);
  });
});
