import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, effectScope, nextTick, type Ref } from "vue";

import { throttle, resetECharts } from "./helpers/mock";
import { createSizedContainer, flushAnimationFrame } from "./helpers/dom";
import { useAutoresize } from "../src/composables/autoresize";
import type { AutoResize, EChartsType } from "../src/types";

describe("useAutoresize", () => {
  beforeEach(() => {
    resetECharts();
  });

  it("observes the root element and triggers resize on size change", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");
    const disconnectSpy = vi.spyOn(
      window.ResizeObserver.prototype,
      "disconnect",
    );

    const container = createSizedContainer(120, 80);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(
        chart as Ref<EChartsType | undefined>,
        autoresize as Ref<AutoResize | undefined>,
        root as Ref<HTMLElement | undefined>,
      );
    });

    chart.value = { resize } as unknown as EChartsType;
    root.value = container;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledWith(container);

    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "200px";
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledTimes(1);

    scope.stop();
    await flushAnimationFrame();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("skips resize when autoresize is disabled or container is empty", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>();
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");

    const container = createSizedContainer(0, 0);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(
        chart as Ref<EChartsType | undefined>,
        autoresize as Ref<AutoResize | undefined>,
        root as Ref<HTMLElement | undefined>,
      );
    });

    chart.value = { resize } as unknown as EChartsType;
    root.value = container;
    await nextTick();

    expect(observeSpy).not.toHaveBeenCalled();
    expect(resize).not.toHaveBeenCalled();

    autoresize.value = true;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledWith(container);

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "160px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it("invokes onResize callbacks and respects throttle options", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const onResize = vi.fn();
    const autoresize = ref<AutoResize | undefined>({ throttle: 0, onResize });
    const root = ref<HTMLElement | undefined>();

    const container = createSizedContainer(80, 60);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(
        chart as Ref<EChartsType | undefined>,
        autoresize as Ref<AutoResize | undefined>,
        root as Ref<HTMLElement | undefined>,
      );
    });

    chart.value = { resize } as unknown as EChartsType;
    root.value = container;
    await nextTick();

    expect(vi.mocked(throttle)).not.toHaveBeenCalled();

    container.style.height = "100px";
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);

    autoresize.value = { throttle: 150 };
    await nextTick();

    expect(vi.mocked(throttle)).toHaveBeenCalledTimes(1);
    const [, wait] = vi.mocked(throttle).mock.calls[0];
    expect(wait).toBe(150);

    scope.stop();
  });

  it("disconnects observer when autoresize toggles off and reactivates cleanly", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");
    const disconnectSpy = vi.spyOn(
      window.ResizeObserver.prototype,
      "disconnect",
    );

    const container = createSizedContainer(140, 90);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(
        chart as Ref<EChartsType | undefined>,
        autoresize as Ref<AutoResize | undefined>,
        root as Ref<HTMLElement | undefined>,
      );
    });

    chart.value = { resize } as unknown as EChartsType;
    root.value = container;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledTimes(1);

    autoresize.value = false;
    await nextTick();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(resize).not.toHaveBeenCalled();

    autoresize.value = true;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledTimes(2);

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledTimes(1);

    scope.stop();
  });
});
