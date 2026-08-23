import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetWarnState,
  createEventInvoker,
  isOn,
  isPlainObject,
  isValidArrayIndex,
  parseOnEvent,
  warn,
} from "../src/utils";

describe("utils", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetWarnState();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    __resetWarnState();
  });

  describe("createEventInvoker", () => {
    it("uses a stable handler snapshot for each dispatch", () => {
      const lateHandler = vi.fn();
      const stableHandler = vi.fn();
      const handlers: Array<() => void> = [];
      handlers.push(() => handlers.splice(1, 1, lateHandler), stableHandler);

      const invoke = createEventInvoker(handlers);
      if (!invoke) {
        throw new Error("Expected an array event invoker.");
      }

      invoke();
      expect(stableHandler).toHaveBeenCalledTimes(1);
      expect(lateHandler).not.toHaveBeenCalled();

      invoke();
      expect(stableHandler).toHaveBeenCalledTimes(1);
      expect(lateHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("isOn", () => {
    it("recognizes vue-style event props", () => {
      expect(isOn("onClick")).toBe(true);
      expect(isOn("onNative:click")).toBe(true);
      expect(isOn("onZr:mouseover")).toBe(true);
      expect(isOn("onUpdate:modelValue")).toBe(true);
      expect(isOn("on")).toBe(false);
    });

    it("ignores non-event keys", () => {
      expect(isOn("onclick")).toBe(false);
      expect(isOn("onupdate:modelValue")).toBe(false);
      expect(isOn("foo")).toBe(false);
    });
  });

  describe("parseOnEvent", () => {
    it("extracts event name and once flag", () => {
      expect(parseOnEvent("onClick")).toEqual({ event: "click", once: false });
      expect(parseOnEvent("onZr:click")).toEqual({ event: "zr:click", once: false });
      expect(parseOnEvent("onClickOnce")).toEqual({ event: "click", once: true });
      expect(parseOnEvent("onNative:clickOnce")).toEqual({ event: "native:click", once: true });
    });

    it("returns null for non-event attrs", () => {
      expect(parseOnEvent("onclick")).toBeNull();
      expect(parseOnEvent("on")).toBeNull();
      expect(parseOnEvent("foo")).toBeNull();
    });
  });

  describe("isValidArrayIndex", () => {
    it("accepts non-negative integer strings", () => {
      expect(isValidArrayIndex("0")).toBe(true);
      expect(isValidArrayIndex("42")).toBe(true);
      expect(isValidArrayIndex("4294967294")).toBe(true);
      expect(isValidArrayIndex(" 1")).toBe(false);
    });

    it("rejects invalid inputs", () => {
      expect(isValidArrayIndex("-1")).toBe(false);
      expect(isValidArrayIndex("3.14")).toBe(false);
      expect(isValidArrayIndex("1e3")).toBe(false);
      expect(isValidArrayIndex("foo")).toBe(false);
    });
  });

  describe("isPlainObject", () => {
    it("accepts plain objects", () => {
      expect(isPlainObject({ foo: "bar" })).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    it("rejects arrays, class instances, and primitives", () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new (class {})())).toBe(false);
      expect(isPlainObject(() => ({ foo: "bar" }))).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject("foo")).toBe(false);
    });
  });

  describe("warn", () => {
    it("dedupes repeated onceKey warnings", () => {
      warn("hello", { onceKey: "same-key" });
      warn("hello", { onceKey: "same-key" });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toContain("hello");
    });

    it("supports custom onceStore", () => {
      const onceStore = new Set<string>();

      warn("custom", { onceKey: "k", onceStore });
      warn("custom", { onceKey: "k", onceStore });
      warn("custom", { onceKey: "k" });

      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });
});
