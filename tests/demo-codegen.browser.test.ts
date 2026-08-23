import { defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "./helpers/testing";
import CodeGen from "../demo/CodeGen.vue";

const mocks = vi.hoisted(() => ({
  editorFocus: vi.fn(),
  track: vi.fn(),
  writeText: vi.fn<() => Promise<void>>(),
}));

vi.mock("@vercel/analytics", () => ({ track: mocks.track }));

vi.mock("../demo/composables/useDemoDark", async () => {
  const { ref } = await import("vue");
  return { useDemoDark: () => ref(false) };
});

vi.mock("../demo/services/monaco", () => ({
  createOptionEditor(container: HTMLElement, { initialCode }: { initialCode: string }) {
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

  render(
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
  return { open, trigger: trigger.value };
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
