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
      // Use esbuild repl to keep build process simple
      // https://esbuild.github.io/try/#dAAwLjIzLjAALS1taW5pZnkAY2xhc3MgRUNoYXJ0c0VsZW1lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7CiAgX19kaXNwb3NlID0gbnVsbDsKCiAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7CiAgICBpZiAodGhpcy5fX2Rpc3Bvc2UpIHsKICAgICAgdGhpcy5fX2Rpc3Bvc2UoKTsKICAgICAgdGhpcy5fX2Rpc3Bvc2UgPSBudWxsOwogICAgfQogIH0KfQoKaWYgKGN1c3RvbUVsZW1lbnRzLmdldCh0YWcpID09IG51bGwpIHsKICBjdXN0b21FbGVtZW50cy5kZWZpbmUodGFnLCBFQ2hhcnRzRWxlbWVudCk7Cn0K
      "class EChartsElement extends HTMLElement{__dispose=null;disconnectedCallback(){this.__dispose&&(this.__dispose(),this.__dispose=null)}}customElements.get(tag)==null&&customElements.define(tag,EChartsElement);"
    );
    reg(TAG_NAME);
  } catch {
    return (registered = false);
  }

  return (registered = true);
}
