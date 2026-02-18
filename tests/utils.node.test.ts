import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetWarnState,
  isOn,
  isPlainObject,
  isSameSet,
  isValidArrayIndex,
  omitOn,
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

  describe("omitOn", () => {
    it("returns attrs without event handlers", () => {
      const attrs = {
        id: "chart",
        onClick: () => void 0,
        onNative: () => void 0,
        class: "foo",
      };

      const result = omitOn(attrs);

      expect(result).toEqual({ id: "chart", class: "foo" });
      expect("onClick" in result).toBe(false);
      expect(attrs).toHaveProperty("onClick");
      expect(result).not.toBe(attrs);
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

  describe("isSameSet", () => {
    it("detects identical sets regardless of order", () => {
      expect(isSameSet([1, 2, 2, 3], [3, 2, 1])).toBe(true);
      expect(isSameSet([1, 2, 2, 3], [3, 4, 1])).toBe(false);
    });

    it("detects differing sets", () => {
      expect(isSameSet([1, 2], [1, 2, 3])).toBe(false);
      expect(isSameSet([1, 2], [1, 3])).toBe(false);
    });
  });

  describe("isPlainObject", () => {
    it("accepts plain objects", () => {
      expect(isPlainObject({ foo: "bar" })).toBe(true);
      expect(isPlainObject(() => ({ foo: "bar" }))).toBe(false);
    });

    it("rejects arrays and primitives", () => {
      expect(isPlainObject([])).toBe(false);
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
