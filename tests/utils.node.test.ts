import { describe, expect, it, vi } from "vitest";

import {
  createEventInvoker,
  isIgnorableWatchChange,
  isOn,
  isPlainObject,
  isValidArrayIndex,
  parseOnEvent,
  shallowEqual,
} from "../src/utils";

describe("utils", () => {
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

  describe("shallowEqual", () => {
    it("compares own keys and values without traversing nested objects", () => {
      const nested = {};

      expect(shallowEqual({ value: NaN, nested }, { value: NaN, nested })).toBe(true);
      expect(shallowEqual({ value: 1 }, { value: 2 })).toBe(false);
      expect(shallowEqual({ value: 1 }, { value: 1, extra: undefined })).toBe(false);
      expect(shallowEqual<Record<string, unknown>>({ width: undefined }, { renderer: "svg" })).toBe(
        false,
      );
      expect(shallowEqual({ nested: {} }, { nested: {} })).toBe(false);
    });
  });

  describe("isIgnorableWatchChange", () => {
    it("ignores stable scalars and shallow-equivalent replacements", () => {
      const nested = {};

      expect(isIgnorableWatchChange(undefined, undefined)).toBe(true);
      expect(isIgnorableWatchChange("dark", "dark")).toBe(true);
      expect(isIgnorableWatchChange({ nested }, { nested })).toBe(true);
    });

    it("preserves deep mutations and meaningful replacements", () => {
      const options = {};

      expect(isIgnorableWatchChange(options, options)).toBe(false);
      expect(isIgnorableWatchChange({ nested: {} }, { nested: {} })).toBe(false);
      expect(isIgnorableWatchChange({ renderer: "svg" }, { renderer: "canvas" })).toBe(false);
    });
  });
});
