let registered: boolean | null = null;

export const TAG_NAME = "x-vue-echarts";

export interface EChartsElement extends HTMLElement {
  __dispose: (() => void) | null;
}

function registerElement() {

if (customElements.get(TAG_NAME) == null) {
  customElements.define(TAG_NAME, EChartsElement);
}
}
export class EChartsElement extends HTMLElement {
  __dispose: null | (() => void) = null;

  disconnectedCallback() {
    if (this.__dispose) {
      this.__dispose();
      this.__dispose = null;
    }
  }
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
    registerElement();
  } catch (e) {
    return (registered = false);
  }

  return (registered = true);
}
