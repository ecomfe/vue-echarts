import { describe, it, expect, vi } from "vitest";

import { buildGraphicOption } from "../src/graphic/build";
import { createGraphicCollector } from "../src/graphic/collector";

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

describe("graphic", () => {
  it("builds graphic option with ordered children and replace root", () => {
    const nodes = [
      {
        id: "rect",
        type: "rect",
        parentId: null,
        props: {
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          fill: "#f00",
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
          text: "Hi",
          textFill: "#000",
        },
        handlers: {},
        order: 0,
        sourceId: 2,
      },
    ];

    const option = buildGraphicOption(nodes, "root");
    const root = (option as any).graphic?.elements?.[0] as any;

    expect(root.id).toBe("root");
    expect(root.$action).toBe("replace");

    const [text, rect] = root.children as any[];

    expect(text.type).toBe("text");
    expect(text.x).toBe(2);
    expect(text.y).toBe(4);
    expect(text.style).toMatchObject({ text: "Hi", textFill: "#000" });

    expect(rect.type).toBe("rect");
    expect(rect.shape).toMatchObject({ x: 10, y: 20, width: 30, height: 40 });
    expect(rect.style).toMatchObject({ fill: "#f00" });

    expect(root.children.some((child: any) => child.id === "rect")).toBe(true);
  });

  it("injects info for elements with handlers", () => {
    const nodes = [
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
        handlers: { onClick: () => void 0 },
        order: 0,
        sourceId: 1,
      },
    ];

    const option = buildGraphicOption(nodes, "root");
    const root = (option as any).graphic?.elements?.[0] as any;
    if (!root) {
      throw new Error("Expected root graphic element to exist.");
    }
    const info = root.children?.[0]?.info as Record<string, unknown>;

    expect(info).toMatchObject({ name: "marker", __veGraphicId: "hit" });
  });

  it("builds image/group options and covers info fallback branches", () => {
    const nodes = [
      {
        id: "group",
        type: "group",
        parentId: null,
        props: {
          info: "root",
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
        handlers: { onMouseenter: () => void 0 },
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

    const option = buildGraphicOption(nodes, "root");
    const root = (option as any).graphic?.elements?.[0] as any;
    if (!root) {
      throw new Error("Expected root graphic element to exist.");
    }
    const group = root.children.find((item: any) => item.id === "group");
    if (!group) {
      throw new Error("Expected group node to exist.");
    }
    const image = group.children.find((item: any) => item.id === "img");
    const line = group.children.find((item: any) => item.id === "line");
    const imageHit = group.children.find((item: any) => item.id === "img-hit");
    const custom = root.children.find((item: any) => item.id === "custom");
    const text = root.children.find((item: any) => item.id === "txt");

    expect(group.info).toMatchObject({ value: "root", __veGraphicId: "group" });
    expect(image.style).toMatchObject({
      image: "https://example.com/a.png",
      transition: "all",
    });
    expect(line.shape).toMatchObject({
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      transition: "shape",
    });
    expect(line.info).toMatchObject({ value: 42, __veGraphicId: "line" });
    expect(imageHit.info).toMatchObject({ __veGraphicId: "img-hit" });
    expect(custom.info).toMatchObject({ level: "custom", __veGraphicId: "custom" });
    expect(text.info).toMatchObject({ __veGraphicId: "txt" });
    expect(custom.shape).toBeUndefined();

    expect(root.children.filter((item: any) => item.id === "dup")).toHaveLength(2);
  });

  it("coalesces flushes and warns on duplicate ids", async () => {
    const onFlush = vi.fn();
    const warn = vi.fn();
    const collector = createGraphicCollector({ onFlush, warn });

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

    expect(warn).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledTimes(0);

    await flushMicrotasks();

    expect(onFlush).toHaveBeenCalledTimes(1);

    collector.unregister("dup");
    await flushMicrotasks();

    expect(onFlush).toHaveBeenCalledTimes(2);
  });

  it("exposes current collector nodes", () => {
    const collector = createGraphicCollector({
      onFlush: () => void 0,
      warn: () => void 0,
    });

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
    const collector = createGraphicCollector({
      onFlush: () => void 0,
      warn: () => void 0,
    });

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

  it("does not mark duplicate when same id appears across different passes", () => {
    const warn = vi.fn();
    const collector = createGraphicCollector({
      onFlush: () => void 0,
      warn,
    });

    collector.beginPass();
    collector.register({
      id: "node",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 1,
    });

    collector.beginPass();
    collector.register({
      id: "node",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 2,
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it("skips pending flush callback and ignores operations after dispose", async () => {
    const onFlush = vi.fn();
    const collector = createGraphicCollector({
      onFlush,
      warn: () => void 0,
    });

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
    collector.requestFlush();
    await flushMicrotasks();

    expect(Array.from(collector.getNodes())).toEqual([]);
  });

  it("accepts null, bigint, and symbol values", async () => {
    const onFlush = vi.fn();
    const collector = createGraphicCollector({
      onFlush,
      warn: () => void 0,
    });
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
