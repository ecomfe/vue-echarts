let registered: boolean | null = null;

export const TAG_NAME = "x-vue-echarts";

export interface EChartsElement extends HTMLElement {
  __dispose: (() => void) | null;
}

export function register(): boolean {
  if (registered != null) {
    return registered;
  }

  if (
    typeof HTMLElement === "undefined" ||
    typeof customElements === "undefined"
  ) {
    return (registered = false);
  }

  try {
    class ECElement extends HTMLElement implements EChartsElement {
      __dispose: (() => void) | null = null;

      disconnectedCallback() {
        if (this.__dispose) {
          this.__dispose();
          this.__dispose = null;
        }
      }
    }
    if (customElements.get(TAG_NAME) == null) {
      customElements.define(TAG_NAME, ECElement);
    }
  } catch {
    return (registered = false);
  }

  return (registered = true);
}
