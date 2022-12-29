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
    // Class definitions cannot be transpiled to ES5
    // so we are doing a little trick here to ensure
    // we are using native classes. As we use this as
    // a progressive enhancement, it will be fine even
    // if the browser doesn't support native classes.
    const reg = new Function(
      "tag",
      `class EChartsElement extends HTMLElement {
  __dispose = null;

  disconnectedCallback() {
    if (this.__dispose) {
      this.__dispose();
      this.__dispose = null;
    }
  }
}

if (customElements.get(tag) == null) {
  customElements.define(tag, EChartsElement);
}
`
    );
    reg(TAG_NAME);
  } catch (e) {
    return (registered = false);
  }

  return (registered = true);
}
