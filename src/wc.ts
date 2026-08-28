export const TAG_NAME = "x-vue-echarts";
// Shared across bundles so one copy can trust another copy's disconnect hook.
const LIFECYCLE_MARKER = Symbol.for("vue-echarts.lifecycle");

type LifecycleConstructor = CustomElementConstructor & {
  [LIFECYCLE_MARKER]?: true;
};

export interface EChartsElement extends HTMLElement {
  __dispose: (() => void) | null;
}

function supportsLifecycle(ctor: CustomElementConstructor | undefined): boolean {
  return Boolean((ctor as LifecycleConstructor | undefined)?.[LIFECYCLE_MARKER]);
}

export function register(): boolean {
  const registry = globalThis.customElements;

  if (!registry?.get) {
    return false;
  }

  const existing = registry.get(TAG_NAME);
  if (existing) {
    return supportsLifecycle(existing);
  }

  class ECElement extends HTMLElement implements EChartsElement {
    __dispose: (() => void) | null = null;

    disconnectedCallback(): void {
      if (!this.__dispose) {
        return;
      }
      queueMicrotask(() => {
        if (!this.isConnected && this.__dispose) {
          const dispose = this.__dispose;
          this.__dispose = null;
          dispose();
        }
      });
    }
  }

  Object.defineProperty(ECElement, LIFECYCLE_MARKER, { value: true });
  registry.define(TAG_NAME, ECElement);
  return true;
}
