import { defineComponent, h, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "./helpers/testing";
import CodeGen from "../demo/CodeGen.vue";

const editorFocus = vi.hoisted(() => vi.fn());

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
          editorFocus();
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
  editorFocus.mockClear();
  localStorage.removeItem("ve.codegenOptions");
});

describe("code generator dialog", () => {
  it("moves focus inside on first and later opens, then restores the trigger", async () => {
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

    const button = trigger.value;
    if (!button) {
      throw new Error("Expected a code generator trigger.");
    }

    for (const expectedFocusCount of [1, 2]) {
      button.focus();
      button.click();

      await vi.waitFor(() => {
        const modal = document.querySelector("dialog");
        expect(modal?.open).toBe(true);
        expect(editorFocus).toHaveBeenCalledTimes(expectedFocusCount);
        expect(modal?.contains(document.activeElement)).toBe(true);
      });

      const modal = document.querySelector("dialog");
      if (!modal) {
        throw new Error("Expected an open code generator dialog.");
      }
      modal.dispatchEvent(new Event("cancel", { cancelable: true }));

      await vi.waitFor(() => {
        expect(open.value).toBe(false);
        expect(document.activeElement).toBe(button);
      });
    }
  });
});
