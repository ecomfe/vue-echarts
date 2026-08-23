import { defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "./helpers/testing";
import CodeGen from "../demo/CodeGen.vue";
import type { OptionAnalysisState } from "../demo/composables/useOptionAnalysis";

const mocks = vi.hoisted(() => ({
  analysisStop: vi.fn(),
  editorChange: null as ((value: string) => void) | null,
  editorFocus: vi.fn(),
  track: vi.fn(),
  writeText: vi.fn<() => Promise<void>>(),
}));

vi.mock("@vercel/analytics", () => ({ track: mocks.track }));

vi.mock("../demo/composables/useDemoDark", async () => {
  const { ref } = await import("vue");
  return { useDemoDark: () => ref(false) };
});

vi.mock("../demo/composables/useOptionAnalysis", async () => {
  const { onBeforeUnmount, reactive, ref } = await import("vue");
  return {
    useOptionAnalysis(initialCode: string) {
      const code = ref(initialCode);
      const state = reactive<OptionAnalysisState>({
        status: "ready",
        strategy: "expression",
        diagnostics: [],
        issues: [],
        runtimeError: null,
        option: { series: [{ type: "pie" }] },
        output: "",
        hasBlockingIssue: false,
      });
      onBeforeUnmount(mocks.analysisStop);
      return {
        code,
        state,
        updateSource(value: string) {
          code.value = value;
          state.status = "analyzing";
          state.option = null;
        },
      };
    },
  };
});

vi.mock("../demo/services/monaco", () => ({
  createOptionEditor(
    container: HTMLElement,
    { initialCode, onChange }: { initialCode: string; onChange: (value: string) => void },
  ) {
    mocks.editorChange = onChange;
    let value = initialCode;
    return {
      editor: {
        focus() {
          mocks.editorFocus();
          container.tabIndex = -1;
          container.focus();
        },
        layout: vi.fn(),
      },
      getValue: () => value,
      setValue(next: string) {
        value = next;
      },
      setMarkers: vi.fn(),
      setTheme: vi.fn(),
      dispose: vi.fn(),
    };
  },
  createCodeViewer() {
    return {
      editor: { layout: vi.fn() },
      setValue: vi.fn(),
      setTheme: vi.fn(),
      setLanguage: vi.fn(),
      dispose: vi.fn(),
    };
  },
}));

beforeEach(() => {
  mocks.analysisStop.mockReset();
  mocks.editorChange = null;
  mocks.editorFocus.mockReset();
  mocks.track.mockReset();
  mocks.writeText.mockReset().mockResolvedValue();
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(mocks.writeText);
  localStorage.removeItem("ve.codegenOptions");
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCodegen() {
  const open = ref(false);
  const mounted = ref(false);
  const trigger = ref<HTMLButtonElement | null>(null);

  const screen = render(
    defineComponent(
      () => () =>
        h("div", [
          h(
            "button",
            {
              ref: trigger,
              type: "button",
              onClick() {
                mounted.value = true;
                open.value = true;
              },
            },
            "Open generator",
          ),
          mounted.value
            ? h(CodeGen, {
                open: open.value,
                renderer: "canvas",
                returnFocus: trigger.value,
                "onUpdate:open": (value: boolean) => {
                  open.value = value;
                },
              })
            : null,
        ]),
    ),
  );

  if (!trigger.value) {
    throw new Error("Expected a code generator trigger.");
  }
  return { open, trigger: trigger.value, unmount: screen.unmount };
}

async function openCodegen(trigger: HTMLButtonElement, expectedFocusCount = 1) {
  trigger.focus();
  trigger.click();

  await vi.waitFor(() => {
    const modal = document.querySelector("dialog");
    expect(modal?.open).toBe(true);
    expect(mocks.editorFocus).toHaveBeenCalledTimes(expectedFocusCount);
    expect(modal?.contains(document.activeElement)).toBe(true);
  });

  const modal = document.querySelector("dialog");
  if (!modal) {
    throw new Error("Expected an open code generator dialog.");
  }
  return modal;
}

describe("code generator dialog", () => {
  it("stops option analysis once when unmounted", async () => {
    const { trigger, unmount } = renderCodegen();
    await openCodegen(trigger);

    unmount();

    expect(mocks.analysisStop).toHaveBeenCalledOnce();
  });

  it("moves focus inside on first and later opens, then restores the trigger", async () => {
    const { open, trigger } = renderCodegen();

    for (const expectedFocusCount of [1, 2]) {
      const modal = await openCodegen(trigger, expectedFocusCount);
      modal.dispatchEvent(new Event("cancel", { cancelable: true }));

      await vi.waitFor(() => {
        expect(open.value).toBe(false);
        expect(document.activeElement).toBe(trigger);
      });
    }
  });

  it("reports clipboard success and failure accurately", async () => {
    const { trigger } = renderCodegen();
    const modal = await openCodegen(trigger);
    const copyButton = modal.querySelector<HTMLButtonElement>("button.copy");
    const message = modal.querySelector<HTMLElement>("[role='status']");
    if (!copyButton || !message) {
      throw new Error("Expected copy controls in the code generator dialog.");
    }
    expect(copyButton.disabled).toBe(false);

    mocks.writeText.mockRejectedValueOnce(new Error("Permission denied"));
    copyButton.click();

    await vi.waitFor(() => {
      expect(message.textContent?.trim()).toBe("Couldn't copy to clipboard");
      expect(message.classList).toContain("open");
    });
    expect(mocks.writeText).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();

    copyButton.click();

    await vi.waitFor(() => {
      expect(message.textContent?.trim()).toBe("Copied to clipboard");
      expect(message.classList).toContain("open");
    });
    expect(mocks.writeText).toHaveBeenCalledTimes(2);
    expect(mocks.track).toHaveBeenCalledWith("copy-code", { from: "button" });
  });

  it("disables copying while edited source is awaiting analysis", async () => {
    const { trigger } = renderCodegen();
    const modal = await openCodegen(trigger);
    const copyButton = modal.querySelector<HTMLButtonElement>("button.copy");
    if (!copyButton || !mocks.editorChange) {
      throw new Error("Expected initialized code generator controls.");
    }
    expect(copyButton.disabled).toBe(false);

    mocks.editorChange("{ series: [] }");
    await vi.waitFor(() => expect(copyButton.disabled).toBe(true));
    copyButton.click();

    expect(mocks.writeText).not.toHaveBeenCalled();
  });

  it("closes only when a pointer gesture stays outside the dialog content", async () => {
    const { open, trigger } = renderCodegen();
    const modal = await openCodegen(trigger);
    const content = modal.querySelector<HTMLElement>(".dialog");
    const checkbox = modal.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!content || !checkbox) {
      throw new Error("Expected dialog content and controls.");
    }

    // Keyboard activation emits click without a preceding pointer event.
    checkbox.click();
    expect(checkbox.checked).toBe(true);
    expect(open.value).toBe(true);
    expect(modal.open).toBe(true);

    content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    modal.click();
    expect(open.value).toBe(true);

    modal.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    modal.click();
    await vi.waitFor(() => {
      expect(open.value).toBe(false);
      expect(modal.open).toBe(false);
    });
  });
});
